import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPublicStats } from '#modules/public-api/public.service.js';

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
