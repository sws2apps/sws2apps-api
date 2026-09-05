import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { AppRoleType } from '#domain/users/app-role.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { UserBackupError } from '#modules/users/user-backup-context.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import { retrieveUserBackup } from '#modules/users/services/users-backup.service.js';
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
