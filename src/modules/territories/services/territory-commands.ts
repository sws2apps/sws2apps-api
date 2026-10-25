import { randomUUID } from 'node:crypto';
import {
	getTerritoryGrant,
	isTerritoryHolder,
	isTerritoryManager,
	isTerritoryOffered,
	requireRequestPermission,
	requireTerritoryManager,
} from '../territory-policy.js';
import { TerritoryError } from '../territory.types.js';
import type {
	TerritoryActor,
	TerritoryCommand,
	TerritoryRecord,
	TerritoryState,
} from '../territory.types.js';

const assignTerritory = (
	actor: TerritoryActor,
	state: TerritoryState,
	record: TerritoryRecord,
	command: Extract<TerritoryCommand, { action: 'assign' }>,
	now: string,
): void => {
	requireTerritoryManager(actor);
	const grant = state.policy.grants.find((item) => item.personId === command.personId);
	if (!grant?.eligible || !isTerritoryOffered(grant, record))
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (command.groupId && !grant.groupIds.includes(command.groupId))
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (record.assignment || record.cardLost) throw new TerritoryError('TERRITORY_CONFLICT');
	record.assignment = {
		id: randomUUID(),
		personId: command.personId,
		groupId: command.groupId,
		campaignId: command.campaignId,
		assignedAt: now,
		notes: command.notes,
	};
	delete record.requestedBy;
};

const returnTerritory = (
	actor: TerritoryActor,
	state: TerritoryState,
	record: TerritoryRecord,
	command: Extract<TerritoryCommand, { action: 'return' }>,
	now: string,
): void => {
	if (!record.assignment) throw new TerritoryError('TERRITORY_CONFLICT');
	if (!isTerritoryManager(actor)) {
		const grant = getTerritoryGrant(actor, state.policy);
		if (grant?.access !== 'request' || !isTerritoryHolder(actor, grant, record)) {
			throw new TerritoryError('UNAUTHORIZED_ACCESS');
		}
	}
	record.history.push({
		...record.assignment,
		returnedAt: now,
		completed: command.completed,
		notes: command.notes ?? record.assignment.notes,
	});
	delete record.assignment;
};

const updateAssignmentNote = (
	actor: TerritoryActor,
	record: TerritoryRecord,
	notes: string,
): void => {
	if (!record.assignment) throw new TerritoryError('TERRITORY_CONFLICT');
	if (!isTerritoryManager(actor) && record.assignment.personId !== actor.personId)
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	record.assignment.notes = notes;
};

const updateDoNotCall = (
	actor: TerritoryActor,
	record: TerritoryRecord,
	command: Extract<TerritoryCommand, { action: 'do_not_call' }>,
): void => {
	const manager = isTerritoryManager(actor);
	if (!actor.personId) throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (!manager && record.assignment?.personId !== actor.personId)
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	const existing = record.doNotCalls.find((entry) => entry.id === command.entryId);
	if (existing && !manager && existing.addedBy !== actor.personId)
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (!command.content) {
		record.doNotCalls = record.doNotCalls.filter((entry) => entry.id !== command.entryId);
		return;
	}
	if (existing) {
		existing.content = command.content;
		return;
	}
	if (record.doNotCalls.length >= 1000) throw new TerritoryError('TERRITORY_LIMIT_EXCEEDED');
	record.doNotCalls.push({
		id: command.entryId,
		addedBy: actor.personId,
		content: command.content,
	});
};

const changeTerritory = (
	actor: TerritoryActor,
	state: TerritoryState,
	record: TerritoryRecord,
	command: TerritoryCommand,
	now: string,
): void => {
	switch (command.action) {
		case 'assignment_note':
			updateAssignmentNote(actor, record, command.notes);
			break;
		case 'do_not_call':
			updateDoNotCall(actor, record, command);
			break;
		case 'update':
			requireTerritoryManager(actor);
			if (record.assignment && record.dataView !== command.details.dataView)
				throw new TerritoryError('TERRITORY_CONFLICT');
			Object.assign(record, command.details);
			break;
		case 'delete':
			requireTerritoryManager(actor);
			if (record.assignment || record.requestedBy) throw new TerritoryError('TERRITORY_CONFLICT');
			record.deleted = true;
			record.content = '';
			record.privateContent = '';
			record.doNotCalls = [];
			break;
		case 'request':
			requireRequestPermission(actor, state.policy, record);
			record.requestedBy = actor.personId;
			break;
		case 'cancel_request':
			if (!actor.personId || record.requestedBy !== actor.personId)
				throw new TerritoryError('UNAUTHORIZED_ACCESS');
			delete record.requestedBy;
			break;
		case 'assign':
			assignTerritory(actor, state, record, command, now);
			break;
		case 'return':
			returnTerritory(actor, state, record, command, now);
	}
};

/** Revisions are server-owned. A stale offline command must be reconciled, never silently replayed over newer work. */
export const applyTerritoryCommand = (
	state: TerritoryState,
	actor: TerritoryActor,
	id: string,
	command: TerritoryCommand,
	now: string,
): TerritoryRecord => {
	let record = state.records.find((item) => item.id === id);
	if (!record) {
		requireTerritoryManager(actor);
		if (command.action !== 'update') throw new TerritoryError('TERRITORY_NOT_FOUND');
		if (command.expectedRevision !== 0) throw new TerritoryError('TERRITORY_CONFLICT');
		record = {
			...command.details,
			id,
			revision: 0,
			updatedAt: now,
			deleted: false,
			history: [],
			doNotCalls: [],
		};
		state.records.push(record);
	}
	if (record.deleted) throw new TerritoryError('TERRITORY_NOT_FOUND');
	if (record.revision !== command.expectedRevision) throw new TerritoryError('TERRITORY_CONFLICT');
	changeTerritory(actor, state, record, command, now);
	record.revision += 1;
	record.updatedAt = now;
	state.revision += 1;
	return record;
};
