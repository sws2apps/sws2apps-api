import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFeatureFlags } from '#modules/feature-flags/index.js';

describe('persisted feature flag loading', () => {
	it('preserves only installation assignments from the previous three months', async () => {
		const storedFlags = [
			{
				id: 'flag-1',
				name: 'NEW_FEATURE',
				description: 'A staged feature',
				availability: 'app',
				status: true,
				coverage: 50,
				installations: [
					{ id: 'old', last_handshake: '2026-06-04T10:29:59.999Z' },
					{ id: 'boundary', last_handshake: '2026-06-04T10:30:00.000Z' },
					{ id: 'recent', last_handshake: '2026-09-03T10:30:00.000Z' },
					{ id: 'invalid', last_handshake: 'not-a-date' },
				],
			},
		];

		const flags = await loadFeatureFlags({
			getCurrentTime: () => new Date('2026-09-04T10:30:00.000Z'),
			getStoredFile: async (storagePath) => {
				assert.deepEqual(storagePath, { type: 'api', path: 'flags.txt' });
				return JSON.stringify(storedFlags);
			},
		});

		assert.equal(flags.length, 1);
		assert.deepEqual(flags[0]?.installations, [
			{ id: 'boundary', last_handshake: '2026-06-04T10:30:00.000Z' },
			{ id: 'recent', last_handshake: '2026-09-03T10:30:00.000Z' },
		]);
	});

	it('migrates legacy registered timestamps into last_handshake', async () => {
		const storedFlags = [
			{
				id: 'flag-1',
				name: 'NEW_FEATURE',
				description: 'A staged feature',
				availability: 'app',
				status: true,
				coverage: 50,
				installations: [{ id: 'installation-1', registered: '2026-09-01T00:00:00.000Z' }],
			},
		];

		const flags = await loadFeatureFlags({
			getCurrentTime: () => new Date('2026-09-04T10:30:00.000Z'),
			getStoredFile: async () => JSON.stringify(storedFlags),
		});

		assert.deepEqual(flags[0]?.installations, [
			{ id: 'installation-1', last_handshake: '2026-09-01T00:00:00.000Z' },
		]);
	});
});
