import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	CongregationJoinRequestError,
	approveCongregationJoinRequest,
	declineCongregationJoinRequest,
} from '#modules/congregation-administration/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/index.js';

describe('congregation join request approval scope', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;

		const congregation = new Congregation('congregation-1');
		const administrator = new User('administrator-1');
		administrator.profile.role = 'vip';
		administrator.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: ['admin'],
		};
		const unassignedUser = new User('user-1');
		unassignedUser.profile.role = 'vip';

		CongregationsList.list = [congregation];
		UsersList.list = [administrator, unassignedUser];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('rejects approval when the user has no pending request', async () => {
		await assert.rejects(
			approveCongregationJoinRequest(
				'congregation-1',
				'administrator-1',
				'user-1',
				{
					roles: ['publisher'],
					personUid: 'person-1',
					firstname: 'Ada',
					lastname: 'Lovelace',
				},
			),
			(error: unknown) => {
				assert.ok(error instanceof CongregationJoinRequestError);
				assert.equal(error.code, 'USER_NOT_FOUND');
				return true;
			},
		);
	});

	it('approves a pending request and returns notification details', async () => {
		const congregation = CongregationsList.findById('congregation-1')!;
		const user = UsersList.findById('user-1')!;
		congregation.settings.cong_name = 'Central';
		congregation.settings.country_code = 'MG';
		congregation.join_requests = [
			{ user: user.id, request_date: '2026-09-05T08:00:00.000Z' },
		];
		user.email = 'user@example.com';
		const completedOperations: string[] = [];

		const result = await approveCongregationJoinRequest(
			congregation.id,
			'administrator-1',
			user.id,
			{
				roles: ['publisher'],
				personUid: 'person-1',
				firstname: 'Ada',
				lastname: 'Lovelace',
			},
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				isMember: () => true,
				approveMembership: async (_congregation, userId, input) => {
					assert.equal(userId, user.id);
					assert.deepEqual(input, {
						person_uid: 'person-1',
						role: ['publisher'],
						firstname: 'Ada',
						lastname: 'Lovelace',
					});
					user.profile.firstname.value = 'Ada';
					congregation.join_requests = [];
					completedOperations.push('approval');
				},
				getRequests: () => {
					completedOperations.push('requests');
					return [];
				},
			},
		);

		assert.deepEqual(completedOperations, ['approval', 'requests']);
		assert.deepEqual(result, {
			requests: [],
			notification: {
				recipient: 'user@example.com',
				requestorName: 'Ada',
				congregationName: 'Central',
				countryCode: 'MG',
			},
		});
	});

	it('declines a request before returning the refreshed request list', async () => {
		const congregation = CongregationsList.findById('congregation-1')!;
		const completedOperations: string[] = [];

		const result = await declineCongregationJoinRequest(
			congregation.id,
			'administrator-1',
			'user-1',
			{
				findCongregationById: () => congregation,
				isMember: () => true,
				declineMembership: async (_congregation, userId) => {
					assert.equal(userId, 'user-1');
					completedOperations.push('decline');
				},
				getRequests: () => {
					completedOperations.push('requests');
					return [];
				},
			},
		);

		assert.deepEqual(result, []);
		assert.deepEqual(completedOperations, ['decline', 'requests']);
	});

	it('does not mutate requests when the administrator is outside the congregation', async () => {
		const congregation = CongregationsList.findById('congregation-1')!;
		let requestDeclined = false;

		await assert.rejects(
			declineCongregationJoinRequest(
				congregation.id,
				'outside-administrator',
				'user-1',
				{
					findCongregationById: () => congregation,
					isMember: () => false,
					declineMembership: async () => {
						requestDeclined = true;
					},
				},
			),
			(error: unknown) => {
				assert.ok(error instanceof CongregationJoinRequestError);
				assert.equal(error.code, 'MEMBERSHIP_REQUIRED');
				return true;
			},
		);

		assert.equal(requestDeclined, false);
	});
});
