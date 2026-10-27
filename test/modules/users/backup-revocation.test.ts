import assert from 'node:assert/strict';
import { afterEach, beforeEach, it } from 'node:test';

import { CongregationsList } from '#modules/congregations/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { removeUserFromCongregation, UsersList } from '#modules/users/index.js';
import { User } from '#modules/users/user.js';
import { getUserBackupContext } from '#modules/users/user-backup-context.js';
import { retrieveUserBackup } from '#modules/users/services/users-backup.service.js';
import { getPocketBackupContext, retrievePocketBackup } from '#modules/pockets/pocket-backup.service.js';

let originalUsers: User[];
let originalCongregations: Congregation[];
beforeEach(() => {
	originalUsers = UsersList.list;
	originalCongregations = CongregationsList.list;
});
afterEach(() => {
	UsersList.list = originalUsers;
	CongregationsList.list = originalCongregations;
});

const createContext = () => {
	const user = new User('user');
	const congregation = new Congregation('congregation');
	congregation.settings.data_sync.value = true;
	user.profile.congregation = { id: congregation.id, cong_role: ['publisher'], account_type: 'pocket' };
	UsersList.list = [user];
	CongregationsList.list = [congregation];
	return { user, congregation, metadata: JSON.stringify({ ...user.metadata, ...congregation.metadata }) };
};

for (const kind of ['organized', 'pocket'] as const) {
	it(`rejects both new and in-flight ${kind} reads while membership removal is persisting`, async () => {
		const { user, congregation, metadata } = createContext();
		const started = Promise.withResolvers<void>();
		const finishRead = Promise.withResolvers<void>();
		const finishRemoval = Promise.withResolvers<void>();
		const readMetadata = async () => {
			started.resolve();
			await finishRead.promise;
			return { field_service_meetings: '', field_service_scheduling: '' };
		};
		const read = kind === 'organized'
			? retrieveUserBackup(user.id, metadata, { getFieldServiceMetadata: readMetadata })
			: retrievePocketBackup(user.id, metadata, { getMetadata: readMetadata });
		const rejected = assert.rejects(read);
		await started.promise;
		const removal = removeUserFromCongregation(user, congregation, {
			updateProfile: async (target, profile) => { await finishRemoval.promise; target.profile = profile; },
			updateSettings: async () => {},
			updateSessions: async () => {},
			saveBibleStudies: async () => {},
			saveFieldServiceReports: async () => {},
			saveDelegatedFieldServiceReports: async () => {},
			refreshMembers: () => {},
		});
		try {
			assert.equal(user.pendingMembershipRemovals, 1);
			assert.throws(() => getUserBackupContext(user.id));
			assert.throws(() => getPocketBackupContext(user.id, '{}'));
			finishRead.resolve();
			await rejected;
		} finally {
			finishRead.resolve();
			finishRemoval.resolve();
			await removal;
		}
		assert.equal(user.pendingMembershipRemovals, 0);
	});
}

it('restores access after a failed removal leaves the stored membership intact', async () => {
	const { user } = createContext();
	await assert.rejects(removeUserFromCongregation(user, undefined, {
		updateProfile: async () => { throw new Error('Profile write failed'); },
	}), /Profile write failed/);
	assert.equal(user.pendingMembershipRemovals, 0);
	assert.equal(getUserBackupContext(user.id).user, user);
});
