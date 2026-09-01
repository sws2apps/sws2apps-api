import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	getMinimumClientVersion,
	initializeMinimumClientVersion,
	updateMinimumClientVersion,
} from '#modules/administration/services/administration-settings.service.js';
import { serverState } from '#platform/runtime/server-state.js';

describe('administration API settings', () => {
	it('reads the current minimum version from runtime state', () => {
		const originalVersion = serverState.minimumAppVersion;
		serverState.minimumAppVersion = '3.75.0';

		try {
			assert.equal(getMinimumClientVersion(), '3.75.0');
		} finally {
			serverState.minimumAppVersion = originalVersion;
		}
	});

	it('initializes runtime state from the persisted minimum version', async () => {
		const originalVersion = serverState.minimumAppVersion;

		try {
			await initializeMinimumClientVersion(async () => '3.50.0');

			assert.equal(serverState.minimumAppVersion, '3.50.0');
		} finally {
			serverState.minimumAppVersion = originalVersion;
		}
	});

	it('updates runtime state after the version is persisted', async () => {
		const originalVersion = serverState.minimumAppVersion;
		const calls: string[] = [];

		try {
			const updatedVersion = await updateMinimumClientVersion('4.0.0', async (minimumVersion) => {
				calls.push(minimumVersion);
			});

			assert.deepEqual(calls, ['4.0.0']);
			assert.equal(updatedVersion, '4.0.0');
			assert.equal(serverState.minimumAppVersion, '4.0.0');
		} finally {
			serverState.minimumAppVersion = originalVersion;
		}
	});

	it('does not update runtime state when persistence fails', async () => {
		const originalVersion = serverState.minimumAppVersion;
		serverState.minimumAppVersion = '3.0.0';

		try {
			await assert.rejects(
				updateMinimumClientVersion('4.0.0', async () => {
					throw new Error('persistence failed');
				}),
				/persistence failed/,
			);

			assert.equal(serverState.minimumAppVersion, '3.0.0');
		} finally {
			serverState.minimumAppVersion = originalVersion;
		}
	});
});
