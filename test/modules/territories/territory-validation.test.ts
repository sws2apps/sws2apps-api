import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	parseTerritoryBatch,
	parseTerritoryCommand,
	parseTerritoryPolicy,
	isTerritoryId,
} from '#modules/territories/territory-validation.js';
import { parseBackupPayload } from '#modules/backups/backup-payload.js';

const encrypted = 'U2FsdGVkX1' + 'a'.repeat(60);
const details = {
	dataView: 'main',
	type: 'phone',
	categories: [],
	cardLost: false,
	content: encrypted,
	privateContent: encrypted,
};

describe('territory input boundaries', () => {
	it('rejects path traversal, non-finite revisions, plaintext, and forged server fields', () => {
		for (const value of ['../other', 'a/b', '', 'a'.repeat(129)])
			assert.equal(isTerritoryId(value), false);
		for (const expectedRevision of [-1, NaN, Infinity, 1.5, '0']) {
			assert.throws(() => parseTerritoryCommand({ action: 'request', expectedRevision }));
		}
		assert.throws(() =>
			parseTerritoryCommand({ action: 'request', expectedRevision: 0, requestedBy: 'another' }),
		);
		assert.throws(() =>
			parseTerritoryCommand({
				action: 'update',
				expectedRevision: 0,
				details: { ...details, content: 'private plaintext' },
			}),
		);
		assert.throws(() =>
			parseTerritoryCommand({
				action: 'update',
				expectedRevision: 0,
				details: { ...details, history: [] },
			}),
		);
		assert.equal(
			parseTerritoryCommand({ action: 'update', expectedRevision: 0, details }).action,
			'update',
		);
	});

	it('rejects duplicate permission identities and overlarge batches', () => {
		const grant = {
			personId: 'p1',
			eligible: true,
			access: 'own',
			groupIds: [],
			dataViews: ['main'],
			restrictedCategories: [],
			restrictedTypes: [],
		};
		assert.throws(() =>
			parseTerritoryPolicy({ revision: 0, content: encrypted, grants: [grant, grant] }),
		);
		assert.throws(() => parseTerritoryBatch({ expectedRevision: 0, commands: [] }));
		const command = { id: 't1', command: { action: 'update', expectedRevision: 0, details } };
		assert.equal(
			parseTerritoryBatch({
				expectedRevision: 0,
				operationId: 'retry-1',
				commands: [command, command],
			}).commands.length,
			2,
		);
		assert.throws(() =>
			parseTerritoryBatch({ expectedRevision: 0, commands: Array(21).fill(command) }),
		);
	});

	it('rejects attempts to bypass territory commands with a legacy backup', () => {
		assert.throws(() => parseBackupPayload({ metadata: {}, territories: [] }));
		assert.throws(() => parseBackupPayload({ metadata: {}, territories_snapshot: {} }));
	});
});
