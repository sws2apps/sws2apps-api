import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPublicFeatureFlags } from '#modules/feature-flags/feature-flag-rollout.service.js';
import { Flag } from '#modules/feature-flags/flag.js';
import { Flags } from '#modules/feature-flags/flags.js';
import { InstallationsList } from '#modules/installations/installation-list.js';

describe('public feature flag rollout', () => {
	it('returns active application flags with full coverage', async () => {
		const originalFlags = Flags.list;
		const originalInstallations = InstallationsList.list;

		Flags.list = [
			new Flag({
				id: 'enabled-flag',
				name: 'ENABLED_FEATURE',
				description: 'Enabled for every installation',
				availability: 'app',
				status: true,
				coverage: 100,
				installations: [],
			}),
			new Flag({
				id: 'inactive-flag',
				name: 'INACTIVE_FEATURE',
				description: 'Not currently active',
				availability: 'app',
				status: false,
				coverage: 100,
				installations: [],
			}),
		];
		InstallationsList.list = [{
			id: 'installation-1',
			registered: '2026-01-01T00:00:00.000Z',
			status: 'pending',
		}];

		try {
			const result = await getPublicFeatureFlags('installation-1');

			assert.deepEqual(result, { ENABLED_FEATURE: true });
		} finally {
			Flags.list = originalFlags;
			InstallationsList.list = originalInstallations;
		}
	});
});
