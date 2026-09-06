import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadInstallations } from '#modules/installations/index.js';

describe('persisted installation loading', () => {
	it('cleans stale pending and linked installations using one retention cutoff', async () => {
		const storedInstallations = {
			pending: [
				{ id: 'pending-old', last_handshake: '2026-06-04T10:29:59.999Z' },
				{ id: 'pending-current', last_handshake: '2026-06-04T10:30:00.000Z' },
				{ id: 'pending-invalid', last_handshake: 'invalid' },
			],
			linked: [
				{
					user: 'user-1',
					installations: [
						{ id: 'linked-old', last_handshake: '2026-06-01T00:00:00.000Z' },
						{ id: 'linked-current', last_handshake: '2026-09-01T00:00:00.000Z' },
					],
				},
			],
		};

		const installations = await loadInstallations({
			getCurrentTime: () => new Date('2026-09-04T10:30:00.000Z'),
			getStoredFile: async (storagePath) => {
				assert.deepEqual(storagePath, {
					type: 'api',
					path: 'installations.txt',
				});
				return JSON.stringify(storedInstallations);
			},
		});

		assert.deepEqual(installations.pending, [
			{ id: 'pending-current', last_handshake: '2026-06-04T10:30:00.000Z' },
		]);
		assert.deepEqual(installations.linked, [
			{
				user: 'user-1',
				installations: [
					{ id: 'linked-current', last_handshake: '2026-09-01T00:00:00.000Z' },
				],
			},
		]);
	});

	it('uses empty installation collections when nothing is persisted', async () => {
		const installations = await loadInstallations({
			getStoredFile: async () => '',
		});

		assert.deepEqual(installations, { linked: [], pending: [] });
	});

	it('migrates legacy registered timestamps into last_handshake', async () => {
		const storedInstallations = {
			pending: [{ id: 'pending-1', registered: '2026-09-01T00:00:00.000Z' }],
			linked: [
				{
					user: 'user-1',
					installations: [{ id: 'linked-1', registered: '2026-08-01T00:00:00.000Z' }],
				},
			],
		};

		const installations = await loadInstallations({
			getCurrentTime: () => new Date('2026-09-04T10:30:00.000Z'),
			getStoredFile: async () => JSON.stringify(storedInstallations),
		});

		assert.deepEqual(installations.pending, [
			{ id: 'pending-1', last_handshake: '2026-09-01T00:00:00.000Z' },
		]);
		assert.deepEqual(installations.linked[0]?.installations, [
			{ id: 'linked-1', last_handshake: '2026-08-01T00:00:00.000Z' },
		]);
	});
});
