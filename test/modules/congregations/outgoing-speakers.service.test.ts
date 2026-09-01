import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	getApprovedVisitingSpeakerCongregations,
	getPendingOutgoingSpeakerAccess,
} from '#modules/congregations/services/outgoing-speakers.service.js';

const createCongregation = (id: string, name: string, countryCode: string) => {
	const congregation = new Congregation(id);
	congregation.settings.cong_name = name;
	congregation.settings.country_code = countryCode;

	return congregation;
};

describe('outgoing speaker access projections', () => {
	it('returns approved congregations that still exist', () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');
		const approved = createCongregation('congregation-2', 'North', 'MDG');
		congregation.outgoing_speakers.access = [
			{
				cong_id: approved.id,
				request_id: 'request-1',
				status: 'approved',
				key: 'encrypted-key',
				updatedAt: '2026-08-30T00:00:00.000Z',
			},
			{
				cong_id: 'deleted-congregation',
				request_id: 'request-2',
				status: 'approved',
				key: 'encrypted-key',
				updatedAt: '2026-08-30T00:00:00.000Z',
			},
		];

		assert.deepEqual(
			getApprovedVisitingSpeakerCongregations(congregation, [congregation, approved]),
			[{ cong_id: approved.id, request_id: 'request-1', cong_name: 'North' }],
		);
	});

	it('adds congregation details to pending requests', () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');
		const requester = createCongregation('congregation-2', 'South', 'MUS');
		congregation.outgoing_speakers.access = [{
			cong_id: requester.id,
			request_id: 'request-1',
			status: 'pending',
			key: '',
			updatedAt: '2026-08-30T00:00:00.000Z',
		}];

		assert.deepEqual(
			getPendingOutgoingSpeakerAccess(congregation, [congregation, requester]),
			[{
				cong_id: requester.id,
				request_id: 'request-1',
				updatedAt: '2026-08-30T00:00:00.000Z',
				cong_name: 'South',
				country_code: 'MUS',
			}],
		);
	});
});
