import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	approveCongregationMembership,
	buildCongregationJoinRequests,
	requestCongregationMembership,
} from '#modules/congregations/index.js';
import { User } from '#modules/users/user.js';

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

	it('updates a request through copy-on-write before publishing persisted state', async () => {
		const congregation = new Congregation('congregation-1');
		const existingRequest = {
			user: 'user-1',
			request_date: '2026-09-01T00:00:00.000Z',
		};
		congregation.join_requests = [existingRequest];
		let persistedRequests = congregation.join_requests;

		await requestCongregationMembership(congregation, 'user-1', {
			findUserById: () => new User('user-1'),
			getCurrentTimestamp: () => '2026-09-05T10:00:00.000Z',
			saveRequests: async (congregationId, requests) => {
				assert.equal(congregationId, congregation.id);
				assert.equal(existingRequest.request_date, '2026-09-01T00:00:00.000Z');
				persistedRequests = requests;
			},
		});

		assert.notEqual(persistedRequests[0], existingRequest);
		assert.deepEqual(congregation.join_requests, [
			{ user: 'user-1', request_date: '2026-09-05T10:00:00.000Z' },
		]);
	});

	it('does not mutate the current request when persistence fails', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.join_requests = [
			{ user: 'user-1', request_date: '2026-09-01T00:00:00.000Z' },
		];

		await assert.rejects(
			requestCongregationMembership(congregation, 'user-1', {
				findUserById: () => new User('user-1'),
				getCurrentTimestamp: () => '2026-09-05T10:00:00.000Z',
				saveRequests: async () => {
					throw new Error('Request persistence failed');
				},
			}),
			/Request persistence failed/,
		);

		assert.deepEqual(congregation.join_requests, [
			{ user: 'user-1', request_date: '2026-09-01T00:00:00.000Z' },
		]);
	});

	it('assigns an approved user before removing the persisted request', async () => {
		const congregation = new Congregation('congregation-1');
		const user = new User('user-1');
		congregation.join_requests = [
			{ user: user.id, request_date: '2026-09-01T00:00:00.000Z' },
		];
		const completedOperations: string[] = [];

		await approveCongregationMembership(
			congregation,
			user.id,
			{
				role: ['publisher'],
				person_uid: 'person-1',
				firstname: 'Ada',
				lastname: 'Lovelace',
			},
			{
				findUserById: () => user,
				assignUser: async (assignedUser, assignedCongregation, input) => {
					assert.equal(assignedUser, user);
					assert.equal(assignedCongregation, congregation);
					assert.deepEqual(input.role, ['publisher']);
					completedOperations.push('assignment');
				},
				saveRequests: async (_congregationId, requests) => {
					assert.deepEqual(requests, []);
					completedOperations.push('requests');
				},
			},
		);

		assert.deepEqual(completedOperations, ['assignment', 'requests']);
		assert.deepEqual(congregation.join_requests, []);
	});
});
