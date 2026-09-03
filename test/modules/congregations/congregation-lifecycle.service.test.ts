import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	cleanUpLegacyCongregationSettings,
	deleteCongregation,
} from '#modules/congregations/index.js';

describe('congregation deletion lifecycle', () => {
	it('deletes persisted data before removing the cached congregation', async () => {
		const completedOperations: string[] = [];

		await deleteCongregation('congregation-1', {
			deletePersistedCongregation: async (congregationId) => {
				assert.equal(congregationId, 'congregation-1');
				completedOperations.push('persisted');
			},
			removeCongregationById: (congregationId) => {
				assert.equal(congregationId, 'congregation-1');
				completedOperations.push('cache');
			},
		});

		assert.deepEqual(completedOperations, ['persisted', 'cache']);
	});

	it('keeps cached state when persisted deletion fails', async () => {
		let cacheRemoved = false;

		await assert.rejects(
			deleteCongregation('congregation-1', {
				deletePersistedCongregation: async () => {
					throw new Error('Storage unavailable');
				},
				removeCongregationById: () => {
					cacheRemoved = true;
				},
			}),
			/Storage unavailable/,
		);

		assert.equal(cacheRemoved, false);
	});
});

describe('legacy congregation setting cleanup', () => {
	it('removes only legacy non-string publisher sorting values', async () => {
		const legacyCongregation = new Congregation('congregation-1');
		legacyCongregation.settings.group_publishers_sort = {
			field: 'name',
		} as unknown as string;
		const currentCongregation = new Congregation('congregation-2');
		currentCongregation.settings.group_publishers_sort = 'name';
		const emptyCongregation = new Congregation('congregation-3');
		const savedCongregations: string[] = [];

		await cleanUpLegacyCongregationSettings({
			getCongregations: () => [
				legacyCongregation,
				currentCongregation,
				emptyCongregation,
			],
			saveSettings: async (congregation, settings) => {
				assert.equal(settings.group_publishers_sort, undefined);
				assert.notEqual(settings, congregation.settings);
				savedCongregations.push(congregation.id);
			},
		});

		assert.deepEqual(savedCongregations, [legacyCongregation.id]);
		assert.deepEqual(legacyCongregation.settings.group_publishers_sort, {
			field: 'name',
		});
	});

	it('contains persistence failures and records a warning', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.group_publishers_sort = {} as unknown as string;
		const logs: { level: string; message: string }[] = [];

		await cleanUpLegacyCongregationSettings({
			getCongregations: () => [congregation],
			saveSettings: async () => {
				throw new Error('Storage unavailable');
			},
			log: (level, message) => {
				logs.push({ level, message });
			},
		});

		assert.deepEqual(logs, [
			{
				level: 'warn',
				message: 'invalid congregation setting cleanup failed',
			},
		]);
	});
});
