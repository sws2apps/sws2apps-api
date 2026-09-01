import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { saveAndRefresh } from '#domain/persistence/save-and-refresh.js';

describe('save and refresh workflow', () => {
	it('persists, updates local state, and then refreshes metadata', async () => {
		const completedSteps: string[] = [];

		await saveAndRefresh({
			save: async () => {
				completedSteps.push('save');
			},
			updateLocalState: () => {
				completedSteps.push('update local state');
			},
			refreshMetadata: async () => {
				completedSteps.push('refresh metadata');
			},
		});

		assert.deepEqual(completedSteps, [
			'save',
			'update local state',
			'refresh metadata',
		]);
	});

	it('does not update local state or metadata when persistence fails', async () => {
		const completedSteps: string[] = [];
		const persistenceError = new Error('persistence failed');

		await assert.rejects(
			saveAndRefresh({
				save: async () => {
					throw persistenceError;
				},
				updateLocalState: () => {
					completedSteps.push('update local state');
				},
				refreshMetadata: async () => {
					completedSteps.push('refresh metadata');
				},
			}),
			persistenceError,
		);

		assert.deepEqual(completedSteps, []);
	});
});
