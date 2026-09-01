import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Congregation } from '#modules/congregations/congregation.js';
import { findVisitingSpeakerCongregations } from '#modules/meetings/visiting-speaker-directory.js';

const createCongregation = (
	id: string,
	name: string,
	options: { discoverable?: boolean; dataSync?: boolean } = {},
) => {
	return {
		id,
		settings: {
			cong_name: name,
			country_code: 'MDG',
			cong_location: { address: 'Main Street' },
			cong_discoverable: { value: options.discoverable ?? true },
			data_sync: { value: options.dataSync ?? true },
			cong_circuit: [{ type: 'main', value: 'MDG-01' }],
			midweek_meeting: [{ type: 'main', weekday: 2, time: '18:00' }],
			weekend_meeting: [{ type: 'main', weekday: 6, time: '09:00' }],
		},
	} as unknown as Congregation;
};

describe('visiting speaker congregation directory', () => {
	it('returns matching discoverable congregations with public meeting details', () => {
		const congregations = [
			createCongregation('current', 'Central'),
			createCongregation('matching', 'North Central'),
			createCongregation('private', 'Private Central', { discoverable: false }),
			createCongregation('offline', 'Offline Central', { dataSync: false }),
			createCongregation('different', 'South'),
		];

		const result = findVisitingSpeakerCongregations(
			congregations,
			'current',
			'CENTRAL',
		);

		assert.equal(result.length, 1);
		assert.equal(result[0].cong_id, 'matching');
		assert.equal(result[0].cong_name, 'North Central');
		assert.equal(result[0].cong_circuit, 'MDG-01');
		assert.equal(result[0].midweek_meeting?.time, '18:00');
		assert.equal(result[0].weekend_meeting?.time, '09:00');
	});
});
