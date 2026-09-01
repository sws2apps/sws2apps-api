import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCongregationJoinRequests } from '#modules/congregations/services/congregation-join-requests.service.js';

describe('congregation join requests', () => {
	it('adds the requesting user name', () => {
		const requests = [{ user: 'user-1', request_date: '2026-08-28' }];
		const findUser = (userId: string) => {
			if (userId !== 'user-1') return undefined;

			return {
				profile: {
					firstname: { value: 'Jane' },
					lastname: { value: 'Doe' },
				},
			};
		};

		const result = buildCongregationJoinRequests(requests, findUser);

		assert.deepEqual(result, [
			{
				user: 'user-1',
				request_date: '2026-08-28',
				firstname: 'Jane',
				lastname: 'Doe',
			},
		]);
	});

	it('preserves the deleted-user fallback', () => {
		const requests = [{ user: 'deleted-user', request_date: '2026-08-28' }];

		const result = buildCongregationJoinRequests(requests, () => undefined);

		assert.equal(result[0]?.firstname, '_Deleted');
		assert.equal(result[0]?.lastname, '_Deleted');
	});
});
