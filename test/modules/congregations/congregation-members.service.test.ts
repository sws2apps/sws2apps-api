import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encryptData } from '#platform/encryption/encryption.js';
import { Congregation } from '#modules/congregations/congregation.js';
import {
	getCongregationMembers,
	isCongregationMember,
	refreshCongregationMembers,
} from '#modules/congregations/services/congregation-members.service.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('congregation member state', () => {
	it('refreshes and projects current members without exposing encrypted invitation data', () => {
		const originalUsers = UsersList.list;
		const congregation = new Congregation('congregation-1');
		const member = new User('user-1');
		member.profile.congregation = {
			id: congregation.id,
			account_type: 'pocket',
			cong_role: ['publisher'],
			pocket_invitation_code: encryptData('invitation-code'),
		};
		UsersList.list = [member];

		try {
			assert.equal(isCongregationMember(congregation, member.id), true);

			refreshCongregationMembers(congregation);
			const result = getCongregationMembers(congregation, 'visitor-1');

			assert.equal(result.length, 1);
			assert.equal(result[0].id, member.id);
			assert.equal(result[0].profile.pocket_invitation_code, 'invitation-code');
		} finally {
			UsersList.list = originalUsers;
		}
	});
});
