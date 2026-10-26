import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { AppRoleType } from '#domain/users/app-role.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { UserBackupError } from '#modules/users/user-backup-context.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import { retrieveUserBackup as retrieveBackup } from '#modules/users/services/users-backup.service.js';
const retrieveUserBackup: typeof retrieveBackup = (userId, metadata, operations = {}) => retrieveBackup(userId, metadata, {
	getFieldServiceMetadata: async () => ({ field_service_meetings: CongregationsList.list[0]?.metadata.field_service_meetings ?? '', field_service_scheduling: CongregationsList.list[0]?.metadata.field_service_scheduling ?? '' }),
	...operations,
});
import type { StandardRecord } from '../../../src/types/standard-record.js';

const createBackupContext = (
	roles: AppRoleType[],
	dataSyncEnabled: boolean,
) => {
	const congregation = new Congregation('congregation-1');
	congregation.settings.cong_name = 'Central';
	congregation.settings.cong_master_key = 'master-key';
	congregation.settings.cong_access_code = 'access-code';
	congregation.settings.data_sync.value = dataSyncEnabled;

	const user = new User('user-1');
	user.profile.role = 'vip';
	user.profile.congregation = {
		id: congregation.id,
		account_type: 'vip',
		cong_role: roles,
		user_local_uid: 'person-self',
		user_members_delegate: [],
	};

	congregation.members = [user];
	CongregationsList.list = [congregation];
	UsersList.list = [user];

	const matchingMetadata = JSON.stringify({
		...congregation.metadata,
		...user.metadata,
	});

	return { congregation, matchingMetadata, user };
};

describe('user backup retrieval permissions', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	for (const roles of [[], ['publisher'], ['view_schedules']] as AppRoleType[][]) {
		it(`shares every group and meeting with read-only members: ${roles.join(',') || 'no editing role'}`, async () => {
			const { congregation, user } = createBackupContext(roles, true);
			congregation.metadata.field_service_groups = 'groups-new';
			congregation.metadata.field_service_meetings = 'meetings-new';
			const groups = [{ group_id: 'g1' }, { group_id: 'g2' }];
			const meetings = [
				{ meeting_uid: 'one', meeting_data: 'cipher', authorization: { category: 0 as const, group_id: 'g1', conductor: 'c', deleted: false, updatedAt: '2026-10-26T00:00:00Z' } },
				{ meeting_uid: 'two', meeting_data: 'cipher', authorization: { category: 0 as const, group_id: 'g2', conductor: 'c', deleted: false, updatedAt: '2026-10-26T00:00:00Z' } },
			];
			const backup = await retrieveUserBackup(user.id, JSON.stringify({ ...congregation.metadata, ...user.metadata, field_service_groups: '', field_service_meetings: '' }), {
				getFieldServiceGroups: async () => groups,
				getFieldServiceMeetings: async () => meetings,
			});
			assert.deepEqual(backup.field_service_groups, groups);
			assert.deepEqual(backup.field_service_meetings, meetings);
			assert.equal(backup.app_settings.cong_settings?.cong_master_key, undefined);
		});
	}

	it('checks fresh storage revisions instead of relying on another API instance cache', async () => {
		const { congregation, user } = createBackupContext(['publisher'], true);
		let read = false;
		const backup = await retrieveUserBackup(user.id, JSON.stringify({ ...congregation.metadata, ...user.metadata }), {
			getFieldServiceMetadata: async () => ({ field_service_meetings: 'another-instance-update', field_service_scheduling: '' }),
			getFieldServiceMeetings: async () => { read = true; return []; },
		});
		assert.equal(read, true); assert.equal(backup.metadata.field_service_meetings, 'another-instance-update');
	});

	it('refreshes conductor qualifications after a scheduling right is granted even when persons did not change', async () => {
		const { congregation, user } = createBackupContext(['publisher', 'field_service_schedule'], true);
		user.metadata.user_settings = 'rights-new'; let read = false;
		const backup = await retrieveUserBackup(user.id, JSON.stringify({ ...congregation.metadata, ...user.metadata, user_settings: 'rights-old' }), {
			getCongregationPersons: async () => { read = true; return [{ person_uid: 'conductor', person_data: { assignments: 'encrypted-qualifications', archived: 'encrypted-status' } }]; },
		});
		assert.equal(read, true);
		assert.equal((backup.persons[0].person_data as StandardRecord).assignments, 'encrypted-qualifications');
		assert.equal(backup.app_settings.cong_settings?.cong_master_key, undefined);
	});

	it('returns recurring field-service times when general congregation data sync is disabled', async () => {
		const { congregation, user } = createBackupContext(['publisher'], false);
		congregation.settings.field_service_meeting_times = [{ type: 'group-1', weekday: { value: 0, updatedAt: '' }, time: { value: '09:30', updatedAt: '' } }];
		congregation.metadata.cong_settings = 'updated-settings';
		const backup = await retrieveUserBackup(user.id, '{}');
		assert.deepEqual(backup.app_settings.cong_settings?.field_service_meeting_times, congregation.settings.field_service_meeting_times);
		assert.equal(backup.app_settings.cong_settings?.cong_master_key, undefined);
	});

	it('returns a stable error when the user does not exist', async () => {
		await assert.rejects(
			retrieveUserBackup('missing-user', '{}'),
			(error: unknown) => {
				return error instanceof UserBackupError
					&& error.code === 'USER_NOT_FOUND';
			},
		);
	});

	it('redacts the congregation master key from publisher backups', async () => {
		const { matchingMetadata, user } = createBackupContext(['publisher'], false);

		const backup = await retrieveUserBackup(user.id, matchingMetadata);

		assert.equal(backup.app_settings?.cong_settings?.cong_access_code, 'access-code');
		assert.equal(backup.app_settings?.cong_settings?.cong_master_key, undefined);
		assert.equal(backup.persons, undefined);
		assert.equal(backup.cong_users, undefined);
		assert.equal(backup.branch_cong_analysis, undefined);
	});

	it('includes the congregation master key only for an authorized role', async () => {
		const { matchingMetadata, user } = createBackupContext(['admin'], false);

		const backup = await retrieveUserBackup(user.id, matchingMetadata);

		assert.equal(backup.app_settings?.cong_settings?.cong_master_key, 'master-key');
	});

	it('limits private person details to the user and delegated people', async () => {
		const { congregation, matchingMetadata, user } = createBackupContext(
			['publisher'],
			true,
		);
		const requestedMetadata = JSON.parse(matchingMetadata) as Record<string, string>;
		requestedMetadata.persons = 'client-person-date';
		const privateDetails = {
			emergency_contacts: [{ name: 'Private contact' }],
			assignments: [{ type: 'private assignment' }],
			timeAway: [{ start: '2026-09-05' }],
		};

		const backup = await retrieveUserBackup(
			user.id,
			JSON.stringify(requestedMetadata),
			{
				getCongregationPersons: async (congregationId) => {
					assert.equal(congregationId, congregation.id);
					return [
						{
							person_uid: 'person-self',
							person_data: {
								person_firstname: 'Jane',
								...privateDetails,
							},
						},
						{
							person_uid: 'person-other',
							person_data: {
								person_firstname: 'John',
								...privateDetails,
							},
						},
					];
				},
			},
		);

		const people = backup.persons as StandardRecord[];
		const ownDetails = people[0]?.person_data as StandardRecord;
		const otherDetails = people[1]?.person_data as StandardRecord;

		assert.deepEqual(ownDetails.emergency_contacts, privateDetails.emergency_contacts);
		assert.deepEqual(ownDetails.assignments, privateDetails.assignments);
		assert.deepEqual(ownDetails.timeAway, privateDetails.timeAway);
		assert.equal(otherDetails.emergency_contacts, undefined);
		assert.equal(otherDetails.assignments, undefined);
		assert.equal(otherDetails.timeAway, undefined);
	});

	it('keeps the metadata version captured before an asynchronous read', async () => {
		const { congregation, matchingMetadata, user } = createBackupContext(['publisher'], true);
		congregation.metadata.field_service_groups = 'version-before-read';
		const backup = await retrieveUserBackup(user.id, matchingMetadata, {
			getFieldServiceGroups: async () => {
				congregation.metadata.field_service_groups = 'version-after-read';
				return [{ id: 'group-1' }];
			},
		});
		assert.equal(backup.metadata.field_service_groups, 'version-before-read');
		assert.deepEqual(backup.field_service_groups, [{ id: 'group-1' }]);
	});

	it('omits unchanged data without reading storage', async () => {
		const { matchingMetadata, user } = createBackupContext(['publisher'], true);
		const backup = await retrieveUserBackup(user.id, matchingMetadata, {
			getCongregationPersons: async () => { throw new Error('Unexpected persons read'); },
			getFieldServiceGroups: async () => { throw new Error('Unexpected groups read'); },
			getUserFieldServiceReports: async () => { throw new Error('Unexpected reports read'); },
		});
		assert.deepEqual(backup.metadata, {});
		assert.equal(backup.persons, undefined);
		assert.equal(backup.user_field_service_reports, undefined);
	});

	it('serves public schedules to a plain group overseer', async () => {
		const { congregation, matchingMetadata, user } = createBackupContext(
			['group_overseers'],
			true,
		);
		const requestedMetadata = JSON.parse(matchingMetadata) as Record<string, string>;
		requestedMetadata.public_sources = 'client-public-sources-date';
		requestedMetadata.public_schedules = 'client-public-schedules-date';
		requestedMetadata.sources = 'client-private-sources-date';
		requestedMetadata.schedules = 'client-private-schedules-date';

		const backup = await retrieveUserBackup(
			user.id,
			JSON.stringify(requestedMetadata),
			{
				getPublicSources: async (congregationId) => {
					assert.equal(congregationId, congregation.id);
					return [{ key: 'public-source-1' }];
				},
				getPublicSchedules: async (congregationId) => {
					assert.equal(congregationId, congregation.id);
					return [{ key: 'public-schedule-1' }];
				},
				getSources: async () => { throw new Error('private sources must not be read'); },
				getSchedules: async () => { throw new Error('private schedules must not be read'); },
			},
		);

		assert.deepEqual(backup.public_sources, [{ key: 'public-source-1' }]);
		assert.equal(backup.metadata.public_sources, congregation.metadata.public_sources);
		assert.deepEqual(backup.public_schedules, [{ key: 'public-schedule-1' }]);
		assert.equal(backup.metadata.public_schedules, congregation.metadata.public_schedules);
		assert.equal(backup.sources, undefined);
		assert.equal(backup.sched, undefined);
	});

	it('keeps full persons for a plain group overseer', async () => {
		const { congregation, matchingMetadata, user } = createBackupContext(
			['group_overseers'],
			true,
		);
		const requestedMetadata = JSON.parse(matchingMetadata) as Record<string, string>;
		requestedMetadata.persons = 'client-persons-date';

		const backup = await retrieveUserBackup(
			user.id,
			JSON.stringify(requestedMetadata),
			{
				getCongregationPersons: async (congregationId) => {
					assert.equal(congregationId, congregation.id);
					return [
						{
							person_uid: 'person-other',
							person_data: {
								person_firstname: 'John',
								emergency_contacts: [{ name: 'Private contact' }],
								timeAway: [{ start: '2026-09-05' }],
							},
						},
					];
				},
				getPublicSources: async () => [],
				getPublicSchedules: async () => [],
			},
		);

		const people = backup.persons as StandardRecord[];
		const personData = people[0]?.person_data as StandardRecord;
		assert.deepEqual(personData.emergency_contacts, [{ name: 'Private contact' }]);
		assert.deepEqual(personData.timeAway, [{ start: '2026-09-05' }]);
	});

	it('does not serve public schedules to a schedule editor', async () => {
		const { matchingMetadata, user } = createBackupContext(
			['midweek_schedule'],
			true,
		);
		const requestedMetadata = JSON.parse(matchingMetadata) as Record<string, string>;
		requestedMetadata.public_sources = 'client-public-sources-date';
		requestedMetadata.public_schedules = 'client-public-schedules-date';

		const backup = await retrieveUserBackup(
			user.id,
			JSON.stringify(requestedMetadata),
			{
				getPublicSources: async () => { throw new Error('public sources must not be read'); },
				getPublicSchedules: async () => { throw new Error('public schedules must not be read'); },
				getSources: async () => [],
				getSchedules: async () => [],
			},
		);

		assert.equal(backup.public_sources, undefined);
		assert.equal(backup.public_schedules, undefined);
	});

	it('loads administrator-only branch data and member projections', async () => {
		const { congregation, matchingMetadata, user } = createBackupContext(['admin'], true);
		const requestedMetadata = JSON.parse(matchingMetadata) as Record<string, string>;
		requestedMetadata.branch_cong_analysis = 'client-analysis-date';
		requestedMetadata.branch_field_service_reports = 'client-report-date';

		const backup = await retrieveUserBackup(
			user.id,
			JSON.stringify(requestedMetadata),
			{
				getBranchCongAnalysis: async (congregationId) => {
					assert.equal(congregationId, congregation.id);
					return [{ id: 'analysis-1' }];
				},
				getBranchFieldServiceReports: async () => [{ id: 'report-1' }],
				getPublicIncomingTalks: async () => [],
			},
		);

		assert.deepEqual(backup.branch_cong_analysis, [{ id: 'analysis-1' }]);
		assert.deepEqual(backup.branch_field_service_reports, [{ id: 'report-1' }]);
		assert.deepEqual(backup.outgoing_talks, []);
		assert.deepEqual(backup.cong_users, [{
			id: user.id,
			local_uid: 'person-self',
			role: ['admin'],
		}]);
	});
});
