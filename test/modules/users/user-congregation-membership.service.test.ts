import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	assignUserToCongregation,
	removeUserFromCongregation,
	removeUserPocketInvitation,
	updateUserCongregationMembership,
} from '#modules/users/index.js';
import { User } from '#modules/users/user.js';

const createCongregationMember = () => {
	const user = new User('user-1');
	user.profile.role = 'vip';
	user.profile.congregation = {
		id: 'congregation-1',
		cong_role: ['publisher'],
		account_type: 'vip',
		user_local_uid: 'person-1',
		pocket_invitation_code: 'encrypted-old-code',
	};

	return user;
};

describe('user congregation assignment', () => {
	it('builds the assigned profile before refreshing congregation members', async () => {
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		const completedOperations: string[] = [];

		await assignUserToCongregation(
			user,
			congregation,
			{
				role: ['secretary'],
				person_uid: 'person-1',
				firstname: 'Ada',
				lastname: 'Lovelace',
			},
			{
				getCurrentTimestamp: () => '2026-09-03T10:00:00.000Z',
				updateProfile: async (updatedUser, profile) => {
					assert.equal(updatedUser, user);
					assert.notEqual(profile, user.profile);
					assert.deepEqual(profile.congregation, {
						id: congregation.id,
						cong_role: ['secretary'],
						account_type: 'vip',
						user_local_uid: 'person-1',
					});
					assert.deepEqual(profile.firstname, {
						value: 'Ada',
						updatedAt: '2026-09-03T10:00:00.000Z',
					});
					assert.deepEqual(profile.lastname, {
						value: 'Lovelace',
						updatedAt: '2026-09-03T10:00:00.000Z',
					});
					completedOperations.push('profile');
				},
				refreshMembers: (refreshedCongregation) => {
					assert.equal(refreshedCongregation, congregation);
					completedOperations.push('members');
				},
			},
		);

		assert.deepEqual(completedOperations, ['profile', 'members']);
	});

	it('does not refresh members when profile persistence fails', async () => {
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		let membersRefreshed = false;

		await assert.rejects(
			assignUserToCongregation(
				user,
				congregation,
				{ role: ['publisher'] },
				{
					updateProfile: async () => {
						throw new Error('Profile persistence failed');
					},
					refreshMembers: () => {
						membersRefreshed = true;
					},
				},
			),
			/Profile persistence failed/,
		);

		assert.equal(membersRefreshed, false);
	});
});

describe('user congregation membership updates', () => {
	it('updates roles, person links, and encrypted Pocket invitations', async () => {
		const user = createCongregationMember();
		const congregation = new Congregation('congregation-1');
		let invitationCodeToEncrypt = '';
		let persistedInvitationCode = '';

		await updateUserCongregationMembership(
			user,
			congregation,
			{
				roles: ['elder', 'public_talk_schedule'],
				personUid: 'person-2',
				personDelegates: ['person-3'],
				pocketInvitationCode: 'new-invitation-code',
			},
			{
				encryptInvitationCode: (invitationCode) => {
					invitationCodeToEncrypt = invitationCode;
					return 'encrypted-new-code';
				},
				updateProfile: async (_updatedUser, profile) => {
					assert.deepEqual(profile.congregation?.cong_role, [
						'elder',
						'public_talk_schedule',
					]);
					assert.equal(profile.congregation?.user_local_uid, 'person-2');
					assert.deepEqual(profile.congregation?.user_members_delegate, [
						'person-3',
					]);
					persistedInvitationCode =
						profile.congregation?.pocket_invitation_code ?? '';
				},
				refreshMembers: () => undefined,
			},
		);

		assert.equal(invitationCodeToEncrypt, 'new-invitation-code');
		assert.equal(persistedInvitationCode, 'encrypted-new-code');
		assert.equal(
			user.profile.congregation?.pocket_invitation_code,
			'encrypted-old-code',
		);
	});

	it('removes a Pocket invitation before refreshing members', async () => {
		const user = createCongregationMember();
		const congregation = new Congregation('congregation-1');
		const completedOperations: string[] = [];

		await removeUserPocketInvitation(user, congregation, {
			updateProfile: async (_updatedUser, profile) => {
				assert.equal(profile.congregation?.pocket_invitation_code, undefined);
				completedOperations.push('profile');
			},
			refreshMembers: () => completedOperations.push('members'),
		});

		assert.deepEqual(completedOperations, ['profile', 'members']);
	});
});

describe('user congregation removal', () => {
	it('clears congregation state and personal activity before refreshing members', async () => {
		const user = createCongregationMember();
		const congregation = new Congregation('congregation-1');
		user.settings = {
			backup_automatic: 'enabled',
			data_view: 'detailed',
			hour_credits_enabled: 'enabled',
			theme_follow_os_enabled: 'enabled',
		};
		const completedOperations: string[] = [];

		await removeUserFromCongregation(user, congregation, {
			updateProfile: async (_updatedUser, profile) => {
				assert.equal(profile.congregation, undefined);
				completedOperations.push('profile');
			},
			updateSettings: async (_updatedUser, settings) => {
				assert.deepEqual(settings, {
					backup_automatic: '',
					data_view: '',
					hour_credits_enabled: '',
					theme_follow_os_enabled: '',
				});
				completedOperations.push('settings');
			},
			updateSessions: async (_updatedUser, sessions) => {
				assert.deepEqual(sessions, []);
				completedOperations.push('sessions');
			},
			saveFieldServiceReports: async (_updatedUser, reports) => {
				assert.deepEqual(reports, []);
				completedOperations.push('reports');
			},
			saveBibleStudies: async (_updatedUser, studies) => {
				assert.deepEqual(studies, []);
				completedOperations.push('studies');
			},
			saveDelegatedFieldServiceReports: async (_updatedUser, reports) => {
				assert.deepEqual(reports, []);
				completedOperations.push('delegated-reports');
			},
			refreshMembers: () => completedOperations.push('members'),
		});

		assert.deepEqual(completedOperations, [
			'profile',
			'settings',
			'sessions',
			'reports',
			'studies',
			'delegated-reports',
			'members',
		]);
	});

	it('stops cleanup and member refresh after a persistence failure', async () => {
		const user = createCongregationMember();
		const congregation = new Congregation('congregation-1');
		const completedOperations: string[] = [];

		await assert.rejects(
			removeUserFromCongregation(user, congregation, {
				updateProfile: async () => {
					completedOperations.push('profile');
				},
				updateSettings: async () => {
					completedOperations.push('settings');
				},
				updateSessions: async () => {
					completedOperations.push('sessions');
					throw new Error('Session persistence failed');
				},
				saveFieldServiceReports: async () => {
					completedOperations.push('reports');
				},
				refreshMembers: () => completedOperations.push('members'),
			}),
			/Session persistence failed/,
		);

		assert.deepEqual(completedOperations, ['profile', 'settings', 'sessions']);
	});
});
