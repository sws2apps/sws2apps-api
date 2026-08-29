import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { updateMinimumClientVersion } from '../../../src/modules/administration/administration-settings.service.js';
import { serverState } from '../../../src/platform/runtime/server-state.js';

describe('administration API settings', () => {
	it('updates runtime state after the version is persisted', async () => {
		const originalVersion = serverState.minimumAppVersion;
		const calls: string[] = [];

		try {
			await updateMinimumClientVersion('4.0.0', async (minimumVersion) => {
				calls.push(minimumVersion);
			});

			assert.deepEqual(calls, ['4.0.0']);
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
