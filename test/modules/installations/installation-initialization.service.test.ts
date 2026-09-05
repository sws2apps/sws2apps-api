import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initializeInstallations } from '#modules/installations/index.js';

describe('installation initialization', () => {
	it('publishes installations only after loading completes', async () => {
		const installationState = {
			linked: [
				{
					user: 'user-1',
					installations: [
						{
							id: 'installation-1',
							registered: '2026-09-04T10:00:00.000Z',
						},
					],
				},
			],
			pending: [],
		};
		const completedOperations: string[] = [];

		await initializeInstallations({
			loadInstallationState: async () => {
				completedOperations.push('load');
				return installationState;
			},
			replaceInstallations: (loadedInstallations) => {
				assert.equal(loadedInstallations, installationState);
				completedOperations.push('cache');
			},
		});

		assert.deepEqual(completedOperations, ['load', 'cache']);
	});

	it('does not replace installations after a loading failure', async () => {
		let cacheReplaced = false;

		await assert.rejects(
			initializeInstallations({
				loadInstallationState: async () => {
					throw new Error('Installation storage unavailable');
				},
				replaceInstallations: () => {
					cacheReplaced = true;
				},
			}),
			/Installation storage unavailable/,
		);

		assert.equal(cacheReplaced, false);
	});
});
