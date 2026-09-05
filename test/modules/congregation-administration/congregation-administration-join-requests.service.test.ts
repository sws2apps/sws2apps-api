import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	CongregationJoinRequestError,
	approveCongregationJoinRequest,
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
});
