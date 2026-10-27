import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	savePocketBackupAsync,
	saveUserBackupAsync,
	type BackupData,
} from '#modules/backups/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { User } from '#modules/users/user.js';

const createUser = (congregationId = 'congregation-1') => {
	const user = new User('user-1');
	user.profile.congregation = {
		id: congregationId,
		account_type: 'vip',
		cong_role: ['publisher'],
		user_local_uid: 'person-2',
	};

	return user;
};

const createBackup = (): BackupData => ({
	app_settings: {},
	persons: [
		{
			person_uid: 'person-1',
			person_data: {
				timeAway: 'unrelated-time-away',
				emergency_contacts: 'unrelated-emergency-contacts',
			},
		},
		{
			person_uid: 'person-2',
			person_data: {
				timeAway: 'user-time-away',
				emergency_contacts: 'user-emergency-contacts',
			},
		},
	],
	outgoing_speakers: [],
	speakers_congregations: [],
	visiting_speakers: [],
	branch_cong_analysis: [],
	branch_field_service_reports: [],
	field_service_groups: [],
	meeting_attendance: [],
	sched: [],
	sources: [],
	upcoming_events: [],
	metadata: {},
});

describe('user backup persistence orchestration', () => {
	it('restores only the authenticated user person record in operation order', async () => {
		const congregation = new Congregation('congregation-1');
		const user = createUser(congregation.id);
		const backup = createBackup();
		const operations: string[] = [];

		await saveUserBackupAsync(
			{
				congId: congregation.id,
				userId: user.id,
				userRole: ['publisher'],
				cong_backup: backup,
				uploadId: 'upload-1',
			},
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				saveCongregation: async (savedCongregation, savedBackup, roles) => {
					assert.equal(savedCongregation, congregation);
					assert.equal(savedBackup, backup);
					assert.deepEqual(roles, ['publisher']);
					operations.push('congregation');
				},
				updatePersonData: async (userId, timeAway, emergencyContacts) => {
					assert.equal(userId, user.id);
					assert.equal(timeAway, 'user-time-away');
					assert.equal(emergencyContacts, 'user-emergency-contacts');
					operations.push('person');
				},
				applyUserData: async (savedUser) => {
					assert.equal(savedUser, user);
					operations.push('user');
				},
				discardUpload: (uploadId) => {
					assert.equal(uploadId, 'upload-1');
					operations.push('discard');
					return true;
				},
				logError: () => {
					throw new Error('A successful backup should not log an error');
				},
			},
		);

		assert.deepEqual(operations, ['congregation', 'person', 'user', 'discard']);
	});

	it('does not overwrite personal fields for a schedule editor', async () => {
		const congregation = new Congregation('congregation-1');
		const user = createUser(congregation.id);
		const operations: string[] = [];

		await saveUserBackupAsync(
			{
				congId: congregation.id,
				userId: user.id,
				userRole: ['midweek_schedule'],
				cong_backup: createBackup(),
			},
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				saveCongregation: async () => {
					operations.push('congregation');
				},
				updatePersonData: async () => {
					throw new Error('Schedule editors must not overwrite personal fields');
				},
				applyUserData: async () => {
					operations.push('user');
				},
				logError: () => {
					throw new Error('A successful backup should not log an error');
				},
			},
		);

		assert.deepEqual(operations, ['congregation', 'user']);
	});

	it('fails closed for a user from another congregation and always discards uploads', async () => {
		const congregation = new Congregation('congregation-1');
		const user = createUser('congregation-2');
		const operations: string[] = [];

		await saveUserBackupAsync(
			{
				congId: congregation.id,
				userId: user.id,
				userRole: ['publisher'],
				cong_backup: createBackup(),
				uploadId: 'upload-1',
			},
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				saveCongregation: async () => {
					throw new Error('Cross-congregation persistence must not start');
				},
				logError: (message) => {
					assert.equal(message, 'congregation backup could not be saved');
					operations.push('error');
				},
				discardUpload: () => {
					operations.push('discard');
					return true;
				},
			},
		);

		assert.deepEqual(operations, ['error', 'discard']);
	});
});

describe('volunteer activity participation persistence', () => {
	const participants = [
		{ participation_uid: 'activity-1_person-2', participation_data: 'own' },
		{ participation_uid: 'activity-1_person-1', participation_data: 'someone else' },
		{ participation_uid: 'activity-2_person-22', participation_data: 'suffix lookalike' },
	];

	const createSyncedBackup = () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.data_sync.value = true;
		const backup = { ...createBackup(), volunteer_activity_participants: participants };
		return { congregation, backup };
	};

	it('merges only the publisher own participations from a regular backup', async () => {
		const { congregation, backup } = createSyncedBackup();
		const user = createUser(congregation.id);
		const saved: unknown[] = [];

		await saveUserBackupAsync(
			{ congId: congregation.id, userId: user.id, userRole: ['publisher'], cong_backup: backup },
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				saveCongregation: async () => {},
				updatePersonData: async () => {},
				applyUserData: async () => {},
				saveParticipants: async (savedCongregation, records) => {
					assert.equal(savedCongregation, congregation);
					saved.push(...records);
				},
				logError: () => {
					throw new Error('A successful backup should not log an error');
				},
			},
		);

		assert.deepEqual(saved, [participants[0]]);
	});

	it('merges only the Pocket user own participations', async () => {
		const { congregation, backup } = createSyncedBackup();
		const user = createUser(congregation.id);
		const saved: unknown[] = [];

		const outcome = await savePocketBackupAsync(
			{ userId: user.id, userRole: ['publisher'], cong_backup: backup },
			{
				findCongregationById: () => congregation,
				findUserById: () => user,
				updatePersonData: async () => {},
				applyUserData: async () => {},
				saveParticipants: async (_congregation, records) => {
					saved.push(...records);
				},
			},
		);

		assert.deepEqual(outcome, { status: 'saved' });
		assert.deepEqual(saved, [participants[0]]);
	});

	it('ignores participations without data sync or the publisher role', async () => {
		for (const [dataSync, roles] of [[false, ['publisher']], [true, ['elder']]] as const) {
			const { congregation, backup } = createSyncedBackup();
			congregation.settings.data_sync.value = dataSync;
			const user = createUser(congregation.id);

			const outcome = await savePocketBackupAsync(
				{ userId: user.id, userRole: [...roles], cong_backup: backup },
				{
					findCongregationById: () => congregation,
					findUserById: () => user,
					updatePersonData: async () => {},
					applyUserData: async () => {},
					saveParticipants: async () => {
						throw new Error('Participations must not be saved');
					},
				},
			);

			assert.deepEqual(outcome, { status: 'saved' });
		}
	});
});

describe('Pocket backup persistence orchestration', () => {
	it('restores the matching Pocket person record before applying user data', async () => {
		const user = createUser();
		const operations: string[] = [];

		const outcome = await savePocketBackupAsync(
			{
				userId: user.id,
				userRole: ['publisher'],
				cong_backup: createBackup(),
			},
			{
				findUserById: () => user,
				updatePersonData: async (_userId, timeAway, emergencyContacts) => {
					assert.equal(timeAway, 'user-time-away');
					assert.equal(emergencyContacts, 'user-emergency-contacts');
					operations.push('person');
				},
				applyUserData: async () => {
					operations.push('user');
				},
				logError: () => {
					throw new Error('A successful backup should not log an error');
				},
			},
		);

		assert.deepEqual(operations, ['person', 'user']);
		assert.deepEqual(outcome, { status: 'saved' });
	});

	it('contains a missing Pocket user instead of rejecting asynchronously', async () => {
		const errors: string[] = [];

		const outcome = await savePocketBackupAsync(
			{
				userId: 'missing-user',
				userRole: ['publisher'],
				cong_backup: createBackup(),
			},
			{
				findUserById: () => undefined,
				logError: (message) => {
					errors.push(message);
				},
			},
		);

		assert.deepEqual(errors, ['Pocket backup could not be saved']);
		assert.deepEqual(outcome, { status: 'failed' });
	});
});
