import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import {
	getUserAuxiliaryApplications,
	mergeIncomingFieldServiceReport,
	submitUserAuxiliaryApplication,
	submitUserFieldServiceReport,
	UserCongregationActivityError,
} from '#modules/users/services/users-congregation-activity.service.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('incoming user field service reports', () => {
	it('adds a report with a server-generated identity', () => {
		const report = {
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 5,
		};

		const result = mergeIncomingFieldServiceReport([], report, () => 'report-1');

		assert.deepEqual(result, [{ ...report, report_id: 'report-1' }]);
	});

	it('updates the existing report without mutating the stored input', () => {
		const currentReports = [{
			report_id: 'report-1',
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 2,
		}];
		const updatedReport = {
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 7,
			comments: 'Updated',
		};

		const result = mergeIncomingFieldServiceReport(currentReports, updatedReport);

		assert.equal(result[0].report_id, 'report-1');
		assert.equal(result[0].hours, 7);
		assert.equal(result[0].hours_credits, 7);
		assert.equal(result[0].comments, 'Updated');
		assert.equal(currentReports[0].hours, 2);
	});
});

const createCongregationActivityContext = () => {
	const congregation = new Congregation('congregation-1');
	const user = new User('user-1');
	user.profile.congregation = {
		id: congregation.id,
		account_type: 'vip',
		cong_role: ['publisher'],
		user_local_uid: 'person-1',
	};
	UsersList.list = [user];
	CongregationsList.list = [congregation];

	return { congregation, user };
};

describe('user congregation activity persistence', () => {
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

	it('returns a stable error when the user does not exist', () => {
		assert.throws(
			() => getUserAuxiliaryApplications('missing-user'),
			(error: unknown) => {
				return error instanceof UserCongregationActivityError
					&& error.code === 'USER_NOT_FOUND';
			},
		);
	});

	it('awaits auxiliary application persistence with server-owned fields', async () => {
		const { congregation, user } = createCongregationActivityContext();
		let applicationSaved = false;

		await submitUserAuxiliaryApplication(
			user.id,
			{ months: ['2026/09'], continuous: false, submitted: '2026-09-05' },
			{
				createRequestId: () => 'REQUEST-1',
				getCurrentTimestamp: () => '2026-09-05T10:00:00.000Z',
				saveApplication: async (target, application) => {
					assert.equal(target, congregation);
					assert.equal(application.request_id, 'REQUEST-1');
					assert.equal(application.person_uid, 'person-1');
					assert.equal(application.updatedAt, '2026-09-05T10:00:00.000Z');
					applicationSaved = true;
				},
			},
		);

		assert.equal(applicationSaved, true);
	});

	it('propagates auxiliary application persistence failures', async () => {
		const { user } = createCongregationActivityContext();

		await assert.rejects(
			submitUserAuxiliaryApplication(user.id, {}, {
				saveApplication: async () => {
					throw new Error('storage unavailable');
				},
			}),
			/storage unavailable/,
		);
	});

	it('publishes merged reports only after persistence succeeds', async () => {
		const { congregation, user } = createCongregationActivityContext();
		congregation.incoming_reports = [{
			report_id: 'report-1',
			report_month: '2026/09',
			person_uid: 'person-1',
			hours: 2,
		}];

		await submitUserFieldServiceReport(
			user.id,
			{
				report_month: '2026/09',
				person_uid: 'person-1',
				hours: 8,
			},
			{
				saveIncomingReports: async (target, reports) => {
					assert.equal(target.incoming_reports[0]?.hours, 2);
					assert.equal(reports[0]?.hours, 8);
					target.incoming_reports = reports;
				},
			},
		);

		assert.equal(congregation.incoming_reports[0]?.hours, 8);
	});

	it('keeps report state unchanged when persistence fails', async () => {
		const { congregation, user } = createCongregationActivityContext();
		congregation.incoming_reports = [{
			report_id: 'report-1',
			report_month: '2026/09',
			person_uid: 'person-1',
			hours: 2,
		}];

		await assert.rejects(
			submitUserFieldServiceReport(
				user.id,
				{
					report_month: '2026/09',
					person_uid: 'person-1',
					hours: 8,
				},
				{
					saveIncomingReports: async () => {
						throw new Error('storage unavailable');
					},
				},
			),
			/storage unavailable/,
		);

		assert.equal(congregation.incoming_reports[0]?.hours, 2);
	});
});
