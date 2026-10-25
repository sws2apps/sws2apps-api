import {
	hasOnlyKeys,
	isObject,
	isTerritoryId,
	isOptionalId,
	isOptionalContent,
	isEncryptedContent,
} from './territory-guards.js';

export const isOptionalCount = (value: unknown): boolean =>
	value === undefined ||
	(Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 10000000);
export const isTerritoryDate = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
	Number.isFinite(Date.parse(value)) &&
	new Date(value).toISOString() === value;
export const isOptionalDate = (value: unknown): boolean =>
	value === undefined || isTerritoryDate(value);
const validAssignment = (value: unknown): boolean => {
	if (!isObject(value)) return false;
	if (
		!hasOnlyKeys(value, [
			'id',
			'personId',
			'groupId',
			'campaignId',
			'assignedAt',
			'returnedAt',
			'completed',
			'notes',
			'content',
			'card',
		])
	)
		return false;
	if (!isTerritoryId(value.id) || !isTerritoryId(value.personId)) return false;
	if (!isOptionalId(value.groupId) || !isOptionalId(value.campaignId)) return false;
	if (!isTerritoryDate(value.assignedAt) || !isOptionalDate(value.returnedAt)) return false;
	if (typeof value.returnedAt === 'string' && value.returnedAt < value.assignedAt) return false;
	if (value.completed !== undefined && typeof value.completed !== 'boolean') return false;
	if (value.card !== undefined && value.card !== 'digital' && value.card !== 'printed')
		return false;
	return isOptionalContent(value.notes) && isOptionalContent(value.content);
};
const validHistory = (value: unknown): boolean =>
	Array.isArray(value) &&
	value.length <= 2000 &&
	value.every((item) => validAssignment(item) && !!item.returnedAt) &&
	new Set(value.map((item) => item.id)).size === value.length;
const validDoNotCalls = (value: unknown): boolean =>
	Array.isArray(value) &&
	value.length <= 1000 &&
	value.every(
		(item) =>
			isObject(item) &&
			hasOnlyKeys(item, ['id', 'addedBy', 'content']) &&
			isTerritoryId(item.id) &&
			isTerritoryId(item.addedBy) &&
			isEncryptedContent(item.content),
	) &&
	new Set(value.map((item) => item.id)).size === value.length;
export const isReconciliation = (value: Record<string, unknown>, keys: string[]): boolean => {
	if (
		!hasOnlyKeys(value, [...keys, 'details', 'assignment', 'history', 'doNotCalls', 'requestedBy'])
	)
		return false;
	if (!validHistory(value.history) || !validDoNotCalls(value.doNotCalls)) return false;
	if (
		value.assignment !== undefined &&
		(!validAssignment(value.assignment) ||
			!!(value.assignment as Record<string, unknown>).returnedAt)
	)
		return false;
	return isOptionalId(value.requestedBy);
};
