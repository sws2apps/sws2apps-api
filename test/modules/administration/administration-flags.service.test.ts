import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAdministrationFlagList } from '#modules/administration/administration-flags.service.js';

describe('administration feature flag list', () => {
	it('includes users and congregations assigned to each flag', () => {
		const result = buildAdministrationFlagList(
			[
				{
					id: 'flag-1',
					name: 'NEW_FEATURE',
					description: 'A new feature',
					availability: 'user',
					coverage: 25,
					status: true,
				},
			],
			[
				{
					id: 'user-1',
					flags: ['flag-1'],
					profile: {
						firstname: { value: 'Jane' },
						lastname: { value: 'Doe' },
					},
				},
			],
			[
				{
					id: 'congregation-1',
					flags: ['flag-1'],
					settings: {
						country_code: 'MG',
						cong_name: 'Central',
					},
				},
			],
		);

		assert.deepEqual(result[0]?.users, [{ name: 'Doe Jane', id: 'user-1' }]);
		assert.deepEqual(result[0]?.congregations, [
			{ name: '(MG) Central', id: 'congregation-1' },
		]);
	});

	it('omits records that are not assigned to a flag', () => {
		const result = buildAdministrationFlagList(
			[
				{
					id: 'flag-1',
					name: 'NEW_FEATURE',
					description: 'A new feature',
					availability: 'app',
					coverage: 0,
					status: false,
				},
			],
			[],
			[],
		);

		assert.deepEqual(result[0]?.users, []);
		assert.deepEqual(result[0]?.congregations, []);
	});
});
