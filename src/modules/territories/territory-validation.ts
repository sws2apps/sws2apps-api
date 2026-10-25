import {
	hasOnlyKeys,
	isObject,
	isTerritoryId,
	isOptionalId,
	isOptionalContent,
	isEncryptedContent,
	isRevision,
	isIds,
} from './territory-guards.js';
export { isTerritoryId } from './territory-guards.js';
import {
	isReconciliation,
	isOptionalCount,
	isOptionalDate,
} from './territory-history-validation.js';
import { TerritoryError } from './territory.types.js';
import type {
	TerritoryCommand,
	TerritoryDetails,
	TerritoryGrant,
	TerritoryPolicy,
} from './territory.types.js';

const isDetails = (value: unknown): value is TerritoryDetails => {
	if (!isObject(value)) return false;
	if (
		!hasOnlyKeys(value, [
			'dataView',
			'type',
			'categories',
			'cardLost',
			'households',
			'content',
			'privateContent',
		])
	)
		return false;
	if (!isTerritoryId(value.dataView) || !isIds(value.categories)) return false;
	if (!['door_to_door', 'business', 'phone'].includes(String(value.type))) return false;
	return (
		typeof value.cardLost === 'boolean' &&
		isOptionalCount(value.households) &&
		isEncryptedContent(value.content) &&
		isEncryptedContent(value.privateContent)
	);
};

const isCommandBody = (value: Record<string, unknown>): boolean => {
	const keys = ['expectedRevision', 'action'];
	switch (value.action) {
		case 'reconcile':
			return isReconciliation(value, keys) && isDetails(value.details);
		case 'update':
			return hasOnlyKeys(value, [...keys, 'details']) && isDetails(value.details);
		case 'delete':
		case 'request':
		case 'cancel_request':
			return hasOnlyKeys(value, keys);
		case 'assign':
			return (
				hasOnlyKeys(value, [...keys, 'personId', 'groupId', 'campaignId', 'notes']) &&
				isTerritoryId(value.personId) &&
				isOptionalId(value.groupId) &&
				isOptionalId(value.campaignId) &&
				isOptionalContent(value.notes)
			);
		case 'assignment_note':
			return hasOnlyKeys(value, [...keys, 'notes']) && isEncryptedContent(value.notes);
		case 'do_not_call':
			return (
				hasOnlyKeys(value, [...keys, 'entryId', 'content']) &&
				isTerritoryId(value.entryId) &&
				isOptionalContent(value.content)
			);
		case 'return':
			return (
				hasOnlyKeys(value, [...keys, 'completed', 'notes', 'returnedAt', 'households']) &&
				typeof value.completed === 'boolean' &&
				isOptionalDate(value.returnedAt) &&
				isOptionalCount(value.households) &&
				isOptionalContent(value.notes)
			);
		default:
			return false;
	}
};

export const parseTerritoryCommand = (value: unknown): TerritoryCommand => {
	if (!isObject(value) || !isRevision(value.expectedRevision) || !isCommandBody(value)) {
		throw new TerritoryError('INPUT_INVALID');
	}
	return value as TerritoryCommand;
};

const isGrant = (value: unknown): value is TerritoryGrant => {
	if (!isObject(value)) return false;
	if (
		!hasOnlyKeys(value, [
			'personId',
			'eligible',
			'access',
			'groupIds',
			'dataViews',
			'restrictedCategories',
			'restrictedTypes',
		])
	)
		return false;
	if (!isTerritoryId(value.personId) || typeof value.eligible !== 'boolean') return false;
	if (!['own', 'view', 'request'].includes(String(value.access))) return false;
	return [value.groupIds, value.dataViews, value.restrictedCategories, value.restrictedTypes].every(
		isIds,
	);
};

export const parseTerritoryPolicy = (value: unknown): TerritoryPolicy => {
	if (!isObject(value) || !hasOnlyKeys(value, ['revision', 'grants', 'content']))
		throw new TerritoryError('INPUT_INVALID');
	if (!isRevision(value.revision) || !isEncryptedContent(value.content))
		throw new TerritoryError('INPUT_INVALID');
	if (!Array.isArray(value.grants) || value.grants.length > 2000 || !value.grants.every(isGrant))
		throw new TerritoryError('INPUT_INVALID');
	const ids = value.grants.map((grant) => grant.personId);
	if (new Set(ids).size !== ids.length) throw new TerritoryError('INPUT_INVALID');
	return value as TerritoryPolicy;
};

export const parseTerritoryBatch = (value: unknown) => {
	if (!isObject(value) || !hasOnlyKeys(value, ['expectedRevision', 'commands', 'operationId']))
		throw new TerritoryError('INPUT_INVALID');
	if (!isOptionalId(value.operationId)) throw new TerritoryError('INPUT_INVALID');
	if (!isRevision(value.expectedRevision)) throw new TerritoryError('INPUT_INVALID');
	if (!Array.isArray(value.commands) || value.commands.length < 1 || value.commands.length > 20)
		throw new TerritoryError('INPUT_INVALID');
	const commands = value.commands.map((entry: unknown) => {
		if (!isObject(entry) || !hasOnlyKeys(entry, ['id', 'command']) || !isTerritoryId(entry.id))
			throw new TerritoryError('INPUT_INVALID');
		const command = parseTerritoryCommand(entry.command);
		return { id: entry.id, command };
	});

	return {
		expectedRevision: value.expectedRevision,
		operationId: value.operationId as string | undefined,
		commands,
	};
};
