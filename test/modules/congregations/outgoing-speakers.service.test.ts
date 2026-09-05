import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	approveOutgoingSpeakerAccess,
	getApprovedVisitingSpeakerCongregations,
	getPendingOutgoingSpeakerAccess,
	OutgoingSpeakerAccessError,
	rejectOutgoingSpeakerAccess,
	requestOutgoingSpeakerAccess,
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

	it('omits pending requests from congregations that no longer exist', () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');
		congregation.outgoing_speakers.access = [{
			cong_id: 'deleted-congregation',
			request_id: 'request-1',
			status: 'pending',
			updatedAt: '2026-08-30T00:00:00.000Z',
		}];

		assert.deepEqual(
			getPendingOutgoingSpeakerAccess(congregation, [congregation]),
			[],
		);
	});
});

describe('outgoing speaker access persistence', () => {
	it('saves a request for the target congregation before publishing it', async () => {
		const requester = createCongregation('congregation-1', 'Central', 'MDG');
		const target = createCongregation('congregation-2', 'North', 'MDG');

		await requestOutgoingSpeakerAccess(
			requester,
			target,
			'temporary-key',
			'request-1',
			{
				getCurrentTimestamp: () => '2026-09-05T10:00:00.000Z',
				saveState: async (congregationId, outgoingSpeakers) => {
					assert.equal(congregationId, target.id);
					assert.deepEqual(target.outgoing_speakers.access, []);
					assert.equal(outgoingSpeakers.access[0]?.cong_id, requester.id);
					assert.equal(outgoingSpeakers.access[0]?.status, 'pending');
				},
			},
		);

		assert.equal(target.outgoing_speakers.access[0]?.request_id, 'request-1');
		assert.equal(
			target.outgoing_speakers.access[0]?.updatedAt,
			'2026-09-05T10:00:00.000Z',
		);
	});

	it('keeps the target state unchanged when saving a request fails', async () => {
		const requester = createCongregation('congregation-1', 'Central', 'MDG');
		const target = createCongregation('congregation-2', 'North', 'MDG');

		await assert.rejects(
			requestOutgoingSpeakerAccess(
				requester,
				target,
				'temporary-key',
				'request-1',
				{
					saveState: async () => {
						throw new Error('storage unavailable');
					},
				},
			),
			/storage unavailable/,
		);

		assert.deepEqual(target.outgoing_speakers.access, []);
	});

	it('publishes an approval only after its encrypted state is saved', async () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');
		congregation.outgoing_speakers.access = [{
			cong_id: 'congregation-2',
			request_id: 'request-1',
			status: 'pending',
			temp_key: 'temporary-key',
			updatedAt: '2026-09-01T00:00:00.000Z',
		}];

		await approveOutgoingSpeakerAccess(
			congregation,
			'request-1',
			'speakers-key',
			{
				encrypt: (value, passphrase) => {
					assert.equal(value, '"speakers-key"');
					assert.equal(passphrase, 'temporary-key');
					return 'encrypted-key';
				},
				getCurrentTimestamp: () => '2026-09-05T10:00:00.000Z',
				saveState: async (_congregationId, outgoingSpeakers) => {
					assert.equal(congregation.outgoing_speakers.access[0]?.status, 'pending');
					assert.equal(outgoingSpeakers.access[0]?.status, 'approved');
					assert.equal(outgoingSpeakers.access[0]?.key, 'encrypted-key');
					assert.equal(outgoingSpeakers.access[0]?.temp_key, undefined);
				},
			},
		);

		assert.equal(congregation.outgoing_speakers.access[0]?.status, 'approved');
		assert.equal(congregation.outgoing_speakers.access[0]?.key, 'encrypted-key');
	});

	it('keeps a pending request unchanged when rejection persistence fails', async () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');
		congregation.outgoing_speakers.access = [{
			cong_id: 'congregation-2',
			request_id: 'request-1',
			status: 'pending',
			temp_key: 'temporary-key',
			updatedAt: '2026-09-01T00:00:00.000Z',
		}];

		await assert.rejects(
			rejectOutgoingSpeakerAccess(congregation, 'request-1', {
				saveState: async () => {
					throw new Error('storage unavailable');
				},
			}),
			/storage unavailable/,
		);

		assert.equal(congregation.outgoing_speakers.access[0]?.status, 'pending');
		assert.equal(
			congregation.outgoing_speakers.access[0]?.temp_key,
			'temporary-key',
		);
	});

	it('returns a stable error when an approval request does not exist', async () => {
		const congregation = createCongregation('congregation-1', 'Central', 'MDG');

		await assert.rejects(
			approveOutgoingSpeakerAccess(congregation, 'missing-request', 'speakers-key'),
			(error: unknown) => {
				return error instanceof OutgoingSpeakerAccessError
					&& error.code === 'REQUEST_NOT_FOUND';
			},
		);
	});
});
