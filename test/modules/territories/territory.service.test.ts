import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	executeTerritoryBatch,
	executeTerritoryCommand,
	retrieveTerritories,
	updateTerritoryPolicy,
} from '#modules/territories/services/territory.service.js';
import type { TerritoryOperations } from '#modules/territories/services/territory.service.js';
import type {
	TerritoryActor,
	TerritoryGrant,
	TerritoryState,
} from '#modules/territories/territory.types.js';
import { TerritoryError } from '#modules/territories/territory.types.js';

const manager: TerritoryActor = { congregationId: 'cong', personId: 'manager', roles: ['elder'] };
const publisher: TerritoryActor = {
	congregationId: 'cong',
	personId: 'alice',
	roles: ['publisher'],
};
const other: TerritoryActor = { ...publisher, personId: 'bob' };
const grant = (personId: string): TerritoryGrant => ({
	personId,
	eligible: true,
	access: 'request',
	groupIds: [],
	dataViews: ['main'],
	restrictedCategories: [],
	restrictedTypes: [],
});
const details = {
	dataView: 'main',
	type: 'door_to_door' as const,
	categories: [],
	cardLost: false,
	content: 'encrypted-map',
	privateContent: 'encrypted-private',
};

const fixture = () => {
	let generation = 0;
	let stored: TerritoryState = {
		schemaVersion: 1,
		revision: 0,
		policy: { revision: 0, content: 'encrypted-settings', grants: [grant('alice'), grant('bob')] },
		records: [
			{
				...details,
				id: 't1',
				revision: 0,
				updatedAt: '',
				deleted: false,
				history: [],
				doNotCalls: [],
			},
		],
	};
	const operations: TerritoryOperations = {
		read: async () => ({ state: structuredClone(stored), generation: String(generation) }),
		write: async (_id, expected, state) => {
			if (expected !== String(generation)) throw new TerritoryError('TERRITORY_CONFLICT');
			stored = structuredClone(state);
			generation += 1;
		},
		getEvents: async () => [{ event_uid: 'campaign' }],
		getPersons: async () => [{ person_uid: 'alice' }, { person_uid: 'bob' }],
		now: () => '2026-10-25T12:00:00.000Z',
	};
	return { operations, state: () => stored };
};

const rejectsCode = (code: string) => (error: unknown) =>
	error instanceof TerritoryError && error.code === code;

describe('territory workflow', () => {
	it('requests, assigns a canonical campaign and returns without replacing territory notes', async () => {
		const { operations, state } = fixture();
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'request', expectedRevision: 0 },
			operations,
		);
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 1, personId: 'alice', campaignId: 'campaign' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{
				action: 'return',
				expectedRevision: 2,
				completed: true,
				notes: 'encrypted-assignment-note',
			},
			operations,
		);
		const record = state().records[0];
		assert.equal(record.revision, 3);
		assert.equal(record.content, 'encrypted-map');
		assert.equal(record.assignment, undefined);
		assert.equal(record.history[0].campaignId, 'campaign');
		assert.equal(record.history[0].notes, 'encrypted-assignment-note');
		assert.equal(record.history[0].completed, true);
	});

	it('accepts only one concurrent assignment and rejects a stale retry', async () => {
		const { operations, state } = fixture();
		const commands = ['alice', 'bob'].map((personId) =>
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'assign', expectedRevision: 0, personId },
				operations,
			),
		);
		const results = await Promise.allSettled(commands);
		assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
		assert.equal(state().records[0].revision, 1);
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'assign', expectedRevision: 0, personId: 'alice' },
				operations,
			),
			rejectsCode('TERRITORY_CONFLICT'),
		);
	});

	it('does not disclose do-not-call content or another publisher history in available territory snapshots', async () => {
		const { operations } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'return', expectedRevision: 1, completed: true, notes: 'private-note' },
			operations,
		);
		const snapshot = await retrieveTerritories(other, operations);
		assert.equal(snapshot.records[0].privateContent, '');
		assert.deepEqual(snapshot.records[0].history, []);
		assert.deepEqual(
			snapshot.policy.grants.map((item) => item.personId),
			['bob'],
		);
	});

	it('removes no-longer-visible records from the next complete snapshot', async () => {
		const { operations } = fixture();
		assert.equal((await retrieveTerritories(other, operations)).records.length, 1);
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice' },
			operations,
		);
		assert.equal((await retrieveTerritories(other, operations)).records.length, 0);
	});

	it('prevents publishers from editing content, assigning, or deleting', async () => {
		const { operations } = fixture();
		for (const command of [
			{ action: 'update' as const, details },
			{ action: 'assign' as const, personId: 'alice' },
			{ action: 'delete' as const },
		]) {
			await assert.rejects(
				executeTerritoryCommand(publisher, 't1', { ...command, expectedRevision: 0 }, operations),
				rejectsCode('UNAUTHORIZED_ACCESS'),
			);
		}
	});

	it('denies another publisher return and cancellation', async () => {
		const { operations } = fixture();
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'request', expectedRevision: 0 },
			operations,
		);
		await assert.rejects(
			executeTerritoryCommand(
				other,
				't1',
				{ action: 'cancel_request', expectedRevision: 1 },
				operations,
			),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 1, personId: 'alice' },
			operations,
		);
		await assert.rejects(
			executeTerritoryCommand(
				other,
				't1',
				{ action: 'return', expectedRevision: 2, completed: true },
				operations,
			),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
	});

	it('enforces eligibility, category restrictions and data views', async () => {
		for (const change of [
			{ eligible: false },
			{ restrictedTypes: ['door_to_door'] },
			{ dataViews: ['different'] },
		]) {
			const { operations, state } = fixture();
			Object.assign(state().policy.grants[0], change);
			await assert.rejects(
				executeTerritoryCommand(
					publisher,
					't1',
					{ action: 'request', expectedRevision: 0 },
					operations,
				),
				rejectsCode('UNAUTHORIZED_ACCESS'),
			);
		}
	});

	it('prevents requests and assignments for lost cards', async () => {
		const { operations, state } = fixture();
		state().records[0].cardLost = true;
		await assert.rejects(
			executeTerritoryCommand(
				publisher,
				't1',
				{ action: 'request', expectedRevision: 0 },
				operations,
			),
			rejectsCode('TERRITORY_CONFLICT'),
		);
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'assign', expectedRevision: 0, personId: 'alice' },
				operations,
			),
			rejectsCode('TERRITORY_CONFLICT'),
		);
	});

	it('allows a group overseer return only for the attested group', async () => {
		const { operations, state } = fixture();
		state().policy.grants[0].groupIds = ['group1'];
		state().policy.grants[1].groupIds = ['group1'];
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice', groupId: 'group1' },
			operations,
		);
		await executeTerritoryCommand(
			other,
			't1',
			{ action: 'return', expectedRevision: 1, completed: true },
			operations,
		);
		assert.equal(state().records[0].history[0].groupId, 'group1');
	});

	it('rejects unknown campaigns and unattested groups', async () => {
		const { operations } = fixture();
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'assign', expectedRevision: 0, personId: 'alice', campaignId: 'missing' },
				operations,
			),
			rejectsCode('INPUT_INVALID'),
		);
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'assign', expectedRevision: 0, personId: 'alice', groupId: 'group1' },
				operations,
			),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
	});

	it('keeps tombstones and never resurrects a deleted identifier', async () => {
		const { operations, state } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'delete', expectedRevision: 0 },
			operations,
		);
		assert.equal(state().records[0].deleted, true);
		assert.equal((await retrieveTerritories(publisher, operations)).records.length, 0);
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{ action: 'update', expectedRevision: 1, details },
				operations,
			),
			rejectsCode('TERRITORY_NOT_FOUND'),
		);
	});

	it('commits split records and source deletion atomically', async () => {
		const { operations, state } = fixture();
		await executeTerritoryBatch(
			manager,
			{
				expectedRevision: 0,
				commands: [
					{ id: 't1', command: { action: 'delete', expectedRevision: 0 } },
					{ id: 't2', command: { action: 'update', expectedRevision: 0, details } },
					{ id: 't3', command: { action: 'update', expectedRevision: 0, details } },
				],
			},
			operations,
		);
		assert.equal(state().records.length, 3);
		assert.equal(state().records[0].deleted, true);
	});

	it('rolls back the entire split if one source revision is stale', async () => {
		const { operations, state } = fixture();
		await assert.rejects(
			executeTerritoryBatch(
				manager,
				{
					expectedRevision: 0,
					commands: [
						{ id: 't2', command: { action: 'update', expectedRevision: 0, details } },
						{ id: 't1', command: { action: 'delete', expectedRevision: 9 } },
					],
				},
				operations,
			),
			rejectsCode('TERRITORY_CONFLICT'),
		);
		assert.equal(state().records.length, 1);
	});

	it('limits policy writes to managers, existing people and the current revision', async () => {
		const { operations, state } = fixture();
		await assert.rejects(
			updateTerritoryPolicy(publisher, state().policy, operations),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
		await assert.rejects(
			updateTerritoryPolicy(manager, { ...state().policy, grants: [grant('unknown')] }, operations),
			rejectsCode('INPUT_INVALID'),
		);
		await updateTerritoryPolicy(manager, state().policy, operations);
		await assert.rejects(
			updateTerritoryPolicy(manager, { ...state().policy, revision: 0 }, operations),
			rejectsCode('TERRITORY_CONFLICT'),
		);
	});
});

describe('territory note ownership', () => {
	it('preserves assignment notes when a return does not supply replacement notes', async () => {
		const { operations, state } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice', notes: 'original-note' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'assignment_note', expectedRevision: 1, notes: 'updated-note' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'return', expectedRevision: 2, completed: false },
			operations,
		);
		assert.equal(state().records[0].history[0].notes, 'updated-note');
	});

	it('allows holders to add their own do-not-call entries but protects entries by other authors', async () => {
		const { operations, state } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{
				action: 'do_not_call',
				expectedRevision: 0,
				entryId: 'admin-entry',
				content: 'encrypted-address',
			},
			operations,
		);
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 1, personId: 'alice' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{
				action: 'do_not_call',
				expectedRevision: 2,
				entryId: 'own-entry',
				content: 'encrypted-address',
			},
			operations,
		);
		await assert.rejects(
			executeTerritoryCommand(
				publisher,
				't1',
				{ action: 'do_not_call', expectedRevision: 3, entryId: 'admin-entry' },
				operations,
			),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'do_not_call', expectedRevision: 3, entryId: 'own-entry' },
			operations,
		);
		assert.equal(state().records[0].doNotCalls.length, 1);
	});
});

describe('offline territory reconciliation', () => {
	it('acknowledges a lost response exactly once and rejects changed replay payloads', async () => {
		const { operations, state } = fixture();
		const batch = {
			expectedRevision: 0,
			operationId: 'request-1',
			commands: [{ id: 't1', command: { action: 'request' as const, expectedRevision: 0 } }],
		};
		await executeTerritoryBatch(publisher, batch, operations);
		await executeTerritoryBatch(publisher, batch, operations);
		assert.equal(state().revision, 1);
		await assert.rejects(
			executeTerritoryBatch(publisher, { ...batch, expectedRevision: 1 }, operations),
			rejectsCode('INPUT_INVALID'),
		);
		await assert.rejects(
			executeTerritoryBatch(other, batch, operations),
			rejectsCode('TERRITORY_CONFLICT'),
		);
	});
	it('imports dated history and preserves it during a publisher return', async () => {
		const { operations, state } = fixture();
		const assignment = {
			id: 'active',
			personId: 'alice',
			assignedAt: '2026-10-01T00:00:00.000Z',
			content: 'encrypted-label',
			card: 'printed' as const,
		};
		await executeTerritoryCommand(
			manager,
			't1',
			{
				action: 'reconcile',
				expectedRevision: 0,
				details,
				assignment,
				history: [],
				doNotCalls: [],
			},
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{
				action: 'return',
				expectedRevision: 1,
				completed: true,
				returnedAt: '2026-10-24T00:00:00.000Z',
				households: 209,
			},
			operations,
		);
		assert.equal(state().records[0].history[0].assignedAt, assignment.assignedAt);
		assert.equal(state().records[0].history[0].returnedAt, '2026-10-24T00:00:00.000Z');
		assert.equal(state().records[0].history[0].card, 'printed');
		assert.equal(state().records[0].households, 209);
	});
	it('rejects publisher reconciliation and changing an assignment to an unauthorized group', async () => {
		const { operations } = fixture();
		const command = {
			action: 'reconcile' as const,
			expectedRevision: 0,
			details,
			assignment: { id: 'active', personId: 'alice', assignedAt: '2026-10-01T00:00:00.000Z' },
			history: [],
			doNotCalls: [],
		};
		await assert.rejects(
			executeTerritoryCommand(publisher, 't1', command, operations),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
		await executeTerritoryCommand(manager, 't1', command, operations);
		await assert.rejects(
			executeTerritoryCommand(
				manager,
				't1',
				{
					...command,
					expectedRevision: 1,
					assignment: { ...command.assignment, groupId: 'unrelated' },
				},
				operations,
			),
			rejectsCode('UNAUTHORIZED_ACCESS'),
		);
	});
	it('commits successive commands on one record atomically and rejects stale revisions', async () => {
		const { operations, state } = fixture();
		const batch = {
			expectedRevision: 0,
			commands: [
				{ id: 't1', command: { action: 'request' as const, expectedRevision: 0 } },
				{ id: 't1', command: { action: 'cancel_request' as const, expectedRevision: 0 } },
			],
		};
		await assert.rejects(
			executeTerritoryBatch(publisher, batch, operations),
			rejectsCode('TERRITORY_CONFLICT'),
		);
		assert.equal(state().revision, 0);
		batch.commands[1].command.expectedRevision = 1;
		await executeTerritoryBatch(publisher, batch, operations);
		assert.equal(state().revision, 2);
		assert.equal(state().records[0].requestedBy, undefined);
	});
});

describe('territory history visibility', () => {
	it('keeps personal history after reassignment without disclosing the new holder or private data', async () => {
		const { operations } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{
				action: 'return',
				expectedRevision: 1,
				completed: true,
				returnedAt: '2026-10-25T00:00:00.000Z',
			},
			operations,
		);
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 2, personId: 'bob' },
			operations,
		);
		const snapshot = await retrieveTerritories(publisher, operations);
		assert.equal(snapshot.records.length, 1);
		assert.equal(snapshot.records[0].assignment, undefined);
		assert.equal(snapshot.records[0].privateContent, '');
		assert.equal(snapshot.records[0].inUse, true);
		assert.equal(snapshot.records[0].history.length, 1);
		assert.equal(snapshot.records[0].lastCompletedAt, '2026-10-25T12:00:00.000Z');
	});
	it('shares coverage dates without another publisher assignment history', async () => {
		const { operations } = fixture();
		await executeTerritoryCommand(
			manager,
			't1',
			{ action: 'assign', expectedRevision: 0, personId: 'alice' },
			operations,
		);
		await executeTerritoryCommand(
			publisher,
			't1',
			{ action: 'return', expectedRevision: 1, completed: true },
			operations,
		);
		const snapshot = await retrieveTerritories(other, operations);
		assert.deepEqual(snapshot.records[0].history, []);
		assert.equal(snapshot.records[0].lastCompletedAt, '2026-10-25T12:00:00.000Z');
	});
});
