import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	Flag,
	initializeFeatureFlags,
} from '#modules/feature-flags/index.js';

describe('feature flag initialization', () => {
	it('publishes feature flags only after loading completes', async () => {
		const flags = [
			new Flag({
				id: 'flag-1',
				name: 'NEW_FEATURE',
				description: 'A staged feature',
				availability: 'app',
				status: true,
				coverage: 50,
				installations: [],
			}),
		];
		const completedOperations: string[] = [];

		await initializeFeatureFlags({
			loadFlags: async () => {
				completedOperations.push('load');
				return flags;
			},
			replaceFlags: (loadedFlags) => {
				assert.equal(loadedFlags, flags);
				completedOperations.push('cache');
			},
		});

		assert.deepEqual(completedOperations, ['load', 'cache']);
	});

	it('does not replace flags after a loading failure', async () => {
		let cacheReplaced = false;

		await assert.rejects(
			initializeFeatureFlags({
				loadFlags: async () => {
					throw new Error('Flag storage unavailable');
				},
				replaceFlags: () => {
					cacheReplaced = true;
				},
			}),
			/Flag storage unavailable/,
		);

		assert.equal(cacheReplaced, false);
	});
});
