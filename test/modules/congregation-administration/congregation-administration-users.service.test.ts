import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	CongregationAdministrationUserError,
	addCongregationUser,
	deleteCongregationUserPocketCode,
	removeCongregationUser,
	revokeCongregationUserSession,
	updateCongregationUser,
} from '#modules/congregation-administration/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/index.js';

const assignToCongregation = (user: User, congregationId: string) => {
	user.profile.role = 'vip';
	user.profile.congregation = {
		id: congregationId,
		account_type: 'vip',
		cong_role: ['publisher'],
	};
};

const assertUserNotFound = async (operation: () => Promise<unknown>) => {
	await assert.rejects(operation, (error: unknown) => {
		assert.ok(error instanceof CongregationAdministrationUserError);
		assert.equal(error.code, 'USER_NOT_FOUND');
		return true;
	});
};

describe('congregation administration user scope', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;

		const congregation = new Congregation('congregation-1');
		const administrator = new User('administrator-1');
		assignToCongregation(administrator, congregation.id);

		const otherCongregationUser = new User('other-user-1');
		assignToCongregation(otherCongregationUser, 'congregation-2');

		CongregationsList.list = [congregation];
		UsersList.list = [administrator, otherCongregationUser];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('rejects cross-congregation member mutations without revealing membership', async () => {
		const operations = [
			() =>
				updateCongregationUser(
					'congregation-1',
					'administrator-1',
					'other-user-1',
					'visitor-1',
					{
						secretCode: 'new-code',
						roles: ['publisher'],
						personUid: 'person-1',
						personDelegates: [],
						firstname: 'Other',
						lastname: 'User',
					},
				),
			() =>
				revokeCongregationUserSession(
					'congregation-1',
					'administrator-1',
					'other-user-1',
					'visitor-1',
					'session-1',
				),
			() =>
				deleteCongregationUserPocketCode(
					'congregation-1',
					'administrator-1',
					'other-user-1',
					'visitor-1',
				),
			() =>
				removeCongregationUser(
					'congregation-1',
					'administrator-1',
					'other-user-1',
					'visitor-1',
				),
		];

		for (const operation of operations) {
			await assertUserNotFound(operation);
		}
	});

	it('rejects adding a user who is already assigned to a congregation', async () => {
		await assertUserNotFound(() =>
			addCongregationUser(
				'congregation-1',
				'administrator-1',
				'visitor-1',
				{
					userId: 'other-user-1',
					firstname: 'Other',
					lastname: 'User',
					roles: ['publisher'],
					personUid: 'person-1',
				},
			),
		);
	});
});
