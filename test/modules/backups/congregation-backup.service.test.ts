import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	saveCongregationBackup,
	type BackupData,
	type CongregationBackupOperations,
} from '#modules/backups/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import type { CongSettingsType } from '#modules/congregations/index.js';
import { User } from '#modules/users/user.js';

const createBackup = (): BackupData => ({
	app_settings: {},
	persons: [{ id: 'person-1' }],
	outgoing_speakers: [{ id: 'outgoing-speaker-1' }],
	speakers_congregations: [{ id: 'speaker-congregation-1' }],
	visiting_speakers: [{ id: 'visiting-speaker-1' }],
	branch_cong_analysis: [{ id: 'analysis-1' }],
	branch_field_service_reports: [{ id: 'branch-report-1' }],
	field_service_groups: [{ id: 'group-1' }],
	meeting_attendance: [{ id: 'attendance-1' }],
	sched: [{ id: 'schedule-1' }],
	sources: [{ id: 'source-1' }],
	upcoming_events: [{ id: 'event-1' }],
	incoming_reports: [{ id: 'incoming-report-1' }],
	cong_field_service_reports: [{ id: 'congregation-report-1' }],
	speakers_key: 'incoming-speakers-key',
	metadata: {},
});

const createOperations = () => {
	const savedOperations: string[] = [];
	const users = new Map<string, User>();
	let savedSettings: CongSettingsType | undefined;

	const operations: CongregationBackupOperations = {
		saveSettings: async (_congregation, settings) => {
			savedOperations.push('settings');
			savedSettings = settings;
		},
		savePersons: async () => {
			savedOperations.push('persons');
		},
		saveStandardData: async (_congregation, dataType) => {
			savedOperations.push(dataType);
		},
		saveSpeakersKey: async () => {
			savedOperations.push('speakers_key');
		},
		saveOutgoingSpeakers: async () => {
			savedOperations.push('outgoing_speakers');
		},
		saveIncomingReports: async () => {
			savedOperations.push('incoming_reports');
		},
		findUserById: (userId) => users.get(userId),
		updateProfile: async (user, profile) => {
			savedOperations.push(`profile:${user.id}`);
			user.profile = profile;
		},
	};

	return {
		operations,
		savedOperations,
		users,
		getSavedSettings: () => savedSettings,
	};
};

describe('congregation backup persistence', () => {
	it('preserves server-owned access credentials without mutating the backup', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.cong_access_code = 'server-access-code';
		congregation.settings.cong_master_key = 'server-master-key';

		const backup = createBackup();
		const incomingSettings = structuredClone(congregation.settings);
		incomingSettings.cong_name = 'Restored congregation name';
		incomingSettings.cong_access_code = 'untrusted-access-code';
		incomingSettings.cong_master_key = 'untrusted-master-key';
		backup.app_settings.cong_settings = incomingSettings;
		const originalBackup = structuredClone(backup);
		const recorder = createOperations();

		await saveCongregationBackup(
			congregation,
			backup,
			['midweek_schedule'],
			recorder.operations,
		);

		assert.equal(recorder.getSavedSettings()?.cong_name, 'Restored congregation name');
		assert.equal(recorder.getSavedSettings()?.cong_access_code, 'server-access-code');
		assert.equal(recorder.getSavedSettings()?.cong_master_key, 'server-master-key');
		assert.deepEqual(backup, originalBackup);
	});

	it('restores synchronized data allowed for a congregation secretary', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.data_sync.value = true;
		const recorder = createOperations();

		await saveCongregationBackup(
			congregation,
			createBackup(),
			['secretary'],
			recorder.operations,
		);

		assert.deepEqual(recorder.savedOperations, [
			'persons',
			'speakers_congregations',
			'visiting_speakers',
			'speakers_key',
			'branch_cong_analysis',
			'branch_field_service_reports',
			'field_service_groups',
			'schedules',
			'sources',
			'cong_field_service_reports',
			'meeting_attendance',
			'upcoming_events',
			'outgoing_speakers',
			'incoming_reports',
		]);
	});

	it('does not persist congregation data for an ordinary publisher', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.data_sync.value = true;
		const recorder = createOperations();

		await saveCongregationBackup(
			congregation,
			createBackup(),
			['publisher'],
			recorder.operations,
		);

		assert.deepEqual(recorder.savedOperations, []);
	});

	it('updates roles only for users belonging to the target congregation', async () => {
		const congregation = new Congregation('congregation-1');
		const user = new User('user-1');
		user.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: ['publisher'],
		};
		const userFromAnotherCongregation = new User('user-2');
		userFromAnotherCongregation.profile.congregation = {
			id: 'congregation-2',
			account_type: 'vip',
			cong_role: ['publisher'],
		};
		const originalProfile = user.profile;
		const backup = createBackup();
		backup.cong_users = [
			{ id: user.id, role: ['secretary'] },
			{ id: userFromAnotherCongregation.id, role: ['coordinator'] },
			{ id: 'missing-user', role: ['coordinator'] },
		];
		const recorder = createOperations();
		recorder.users.set(user.id, user);
		recorder.users.set(userFromAnotherCongregation.id, userFromAnotherCongregation);

		await saveCongregationBackup(
			congregation,
			backup,
			['admin'],
			recorder.operations,
		);

		assert.notEqual(user.profile, originalProfile);
		assert.deepEqual(user.profile.congregation?.cong_role, ['secretary']);
		assert.deepEqual(
			userFromAnotherCongregation.profile.congregation.cong_role,
			['publisher'],
		);
		assert.deepEqual(recorder.savedOperations, [`profile:${user.id}`]);
	});
});
