import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import { initializeCongregations } from '#modules/congregations/index.js';

describe('congregation initialization', () => {
	it('refreshes members and incoming talks before publishing loaded state', async () => {
		const firstCongregation = new Congregation('congregation-1');
		const secondCongregation = new Congregation('congregation-2');
		const congregations = [firstCongregation, secondCongregation];
		const completedOperations: string[] = [];

		await initializeCongregations({
			loadCongregations: async () => {
				completedOperations.push('load');
				return congregations;
			},
			refreshMembers: (congregation) => {
				completedOperations.push(`members:${congregation.id}`);
			},
			initializeIncomingTalks: async (loadedCongregations) => {
				assert.equal(loadedCongregations, congregations);
				completedOperations.push('incoming-talks');
			},
			replaceCongregations: (loadedCongregations) => {
				assert.equal(loadedCongregations, congregations);
				completedOperations.push('cache');
			},
		});

		assert.deepEqual(completedOperations, [
			'load',
			'members:congregation-1',
			'members:congregation-2',
			'incoming-talks',
			'cache',
		]);
	});

	it('does not publish partially initialized state when incoming talks fail', async () => {
		const congregation = new Congregation('congregation-1');
		let cacheReplaced = false;

		await assert.rejects(
			initializeCongregations({
				loadCongregations: async () => [congregation],
				refreshMembers: () => undefined,
				initializeIncomingTalks: async () => {
					throw new Error('Incoming talk initialization failed');
				},
				replaceCongregations: () => {
					cacheReplaced = true;
				},
			}),
			/Incoming talk initialization failed/,
		);

		assert.equal(cacheReplaced, false);
	});
});
