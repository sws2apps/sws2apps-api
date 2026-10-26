import { createHash } from 'node:crypto';
import { PartnerError, type PartnerMutation, type PartnerRequest, type PartnerState } from './partner.types.js';

const validDate = (value: string) => {
	if (!/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
	const date = new Date(`${value.replaceAll('/', '-')}T00:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10).replaceAll('-', '/') === value;
};
const validTime = (value?: string) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const validateTimeRange = (data: PartnerRequest['request_data']) => {
	if (data.flexible) return;
	if (!validTime(data.start)) throw new PartnerError('PARTNER_INVALID', 400);
	if (!data.end) return;
	if (!validTime(data.end) || data.end <= data.start!) throw new PartnerError('PARTNER_INVALID', 400);
};

const editableData = (request: PartnerRequest, today: string) => {
	const { date, flexible, start, end, type, comment } = request.request_data;
	if (!validDate(date) || date < today) throw new PartnerError('PARTNER_INVALID', 400);
	if (!Number.isInteger(type) || type < 0 || type > 5) throw new PartnerError('PARTNER_INVALID', 400);
	if (typeof flexible !== 'boolean') throw new PartnerError('PARTNER_INVALID', 400);
	if (typeof comment !== 'string' || comment.length > 5000) throw new PartnerError('PARTNER_INVALID', 400);
	validateTimeRange(request.request_data);
	const result: Pick<PartnerRequest['request_data'], 'date' | 'flexible' | 'type' | 'comment' | 'start' | 'end'> = { date, flexible, type, comment: comment.trim() };
	if (!flexible) result.start = start;
	if (!flexible && end) result.end = end;
	return result;
};

const authorize = (data: PartnerRequest['request_data'], actor: string, action: PartnerMutation['action']) => {
	const owner = data.person_uid === actor;
	if (action === 'join') {
		if (owner || data.partner_uid) throw new PartnerError('PARTNER_CONFLICT', 409);
		return;
	}
	if (action === 'cancel') {
		if (!data.partner_uid || (!owner && data.partner_uid !== actor)) throw new PartnerError('PARTNER_CONFLICT', 409);
		return;
	}
	if (!owner || data.partner_uid) throw new PartnerError('PARTNER_CONFLICT', 409);
};

const createRequest = (mutation: PartnerMutation, actor: string, now: string, today: string): PartnerRequest => ({
	request_uid: mutation.request.request_uid,
	request_data: { ...editableData(mutation.request, today), person_uid: actor, updatedAt: now, _deleted: false },
});

const updateRequest = (current: PartnerRequest, mutation: PartnerMutation, actor: string, now: string, today: string): PartnerRequest => {
	const data = current.request_data;
	if (data._deleted || data.updatedAt !== mutation.request.request_data.updatedAt) throw new PartnerError('PARTNER_CONFLICT', 409);
	authorize(data, actor, mutation.action);
	const updated = structuredClone(current);
	const revision = new Date(Math.max(Date.parse(now), Date.parse(data.updatedAt) + 1)).toISOString();
	if (mutation.action === 'edit') {
		delete updated.request_data.start;
		delete updated.request_data.end;
		Object.assign(updated.request_data, editableData(mutation.request, today));
	}
	if (mutation.action === 'join') {
		editableData(current, today);
		Object.assign(updated.request_data, { partner_uid: actor, arranged_at: revision });
	}
	if (mutation.action === 'cancel') {
		delete updated.request_data.partner_uid;
		delete updated.request_data.arranged_at;
	}
	if (mutation.action === 'delete') updated.request_data._deleted = true;
	updated.request_data.updatedAt = revision;
	return updated;
};

/** A stable operation id makes a lost HTTP response safe to retry. Payload reuse is rejected. */
export const applyPartnerMutation = (state: PartnerState, mutation: PartnerMutation, actor: string, now = new Date().toISOString()) => {
	const fingerprint = createHash('sha256').update(JSON.stringify(mutation)).digest('hex');
	const receipt = state.receipts.find((entry) => entry.id === mutation.operationId && entry.actor === actor);
	if (receipt) {
		if (receipt.fingerprint !== fingerprint) throw new PartnerError('PARTNER_CONFLICT', 409);
		return { state, changes: receipt.result };
	}
	// Allow the current calendar day everywhere, including UTC-12, without trusting a client clock.
	const today = new Date(Date.parse(now) - 12 * 60 * 60 * 1000).toISOString().slice(0, 10).replaceAll('-', '/');
	const current = state.requests.find((record) => record.request_uid === mutation.request.request_uid);
	if ((mutation.action === 'create') === Boolean(current)) throw new PartnerError('PARTNER_CONFLICT', 409);
	if (state.requests.length >= 10000 && !current) throw new PartnerError('PARTNER_LIMIT', 409);
	const updated = current
		? updateRequest(current, mutation, actor, now, today)
		: createRequest(mutation, actor, now, today);
	const changes = [updated];
	if (mutation.action === 'join') changes.push(...withdrawRequests(state.requests, mutation, actor, updated));
	const replacements = new Map(changes.map((record) => [record.request_uid, record]));
	const requests = state.requests.map((record) => replacements.get(record.request_uid) ?? record);
	if (!current) requests.push(updated);
	return {
		state: { requests, receipts: [...state.receipts, { id: mutation.operationId, actor, fingerprint, result: changes }].slice(-2000) },
		changes,
	};
};

const withdrawRequests = (records: PartnerRequest[], mutation: PartnerMutation, actor: string, updated: PartnerRequest) => records
	.filter((record) => isWithdrawable(record, mutation, actor, updated.request_data.date))
	.map((record) => ({ ...record, request_data: { ...record.request_data, _deleted: true, updatedAt: new Date(Math.max(Date.parse(updated.request_data.updatedAt), Date.parse(record.request_data.updatedAt) + 1)).toISOString() } }));

const isWithdrawable = (record: PartnerRequest, mutation: PartnerMutation, actor: string, date: string) => {
	const data = record.request_data;
	if (!mutation.withdrawRequestIds?.includes(record.request_uid)) return false;
	return data.person_uid === actor && !data._deleted && !data.partner_uid && data.date === date;
};
