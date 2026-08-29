import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Flag } from '../../../src/modules/feature-flags/flag.js';
import { Flags } from '../../../src/modules/feature-flags/flags.js';
import { InstallationsList } from '../../../src/modules/installations/installation-list.js';
import {
	buildPublicStats,
	getPublicFeatureFlags,
} from '../../../src/modules/public-api/public.service.js';

describe('public API statistics', () => {
	it('counts congregations by country and excludes administrators from the user count', () => {
		const statistics = buildPublicStats({
			countries: [
				{ countryCode: 'MG', countryName: 'Madagascar', countryGuid: 'country-mg' },
				{ countryCode: 'ZA', countryName: 'South Africa', countryGuid: 'country-za' },
			],
			congregations: [
				{ settings: { country_code: 'MG' } },
				{ settings: { country_code: 'MG' } },
				{ settings: { country_code: 'ZA' } },
			],
			users: [{ profile: { role: 'user' } }, { profile: { role: 'admin' } }],
			languages: 12,
		});

		assert.deepEqual(statistics, {
			languages: 12,
			congregations: 3,
			users: 1,
			countries: {
				count: 2,
				list: [
					{ country_name: 'Madagascar', country_code: 'MG', congregations: 2 },
					{ country_name: 'South Africa', country_code: 'ZA', congregations: 1 },
				],
			},
		});
	});

	it('uses the existing fallback for an unknown country code', () => {
		const statistics = buildPublicStats({
			countries: [],
			congregations: [{ settings: { country_code: 'XX' } }],
			users: [],
			languages: 0,
		});

		assert.deepEqual(statistics.countries.list, [
			{ country_name: 'Unknown', country_code: 'XX', congregations: 1 },
		]);
	});
});

describe('public API feature flags', () => {
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
		InstallationsList.list = [
			{
				id: 'installation-1',
				registered: '2026-01-01T00:00:00.000Z',
				status: 'pending',
			},
		];

		try {
			const result = await getPublicFeatureFlags('installation-1');

			assert.deepEqual(result, { ENABLED_FEATURE: true });
		} finally {
			Flags.list = originalFlags;
			InstallationsList.list = originalInstallations;
		}
	});
});
