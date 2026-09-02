import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	PocketUserError,
	submitPocketReport,
} from '#modules/pockets/pocket-user.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('Pocket user service', () => {
	it('rejects a report when the user has no congregation', () => {
		const originalUsers = UsersList.list;
		const user = new User('user-1');
		UsersList.list = [user];

		try {
			assert.throws(
				() => submitPocketReport(user.id, { report_month: '2026/08' }),
				(error: unknown) =>
					error instanceof PocketUserError && error.code === 'CONGREGATION_NOT_FOUND',
			);
		} finally {
			UsersList.list = originalUsers;
		}
	});

	it('submits a report for a user assigned to an existing congregation', () => {
		const originalUsers = UsersList.list;
		const originalCongregations = CongregationsList.list;
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		user.profile.congregation = {
			id: congregation.id,
			cong_role: ['publisher'],
			account_type: 'pocket',
		};
		UsersList.list = [user];
		CongregationsList.list = [congregation];
		const report = { report_month: '2026/09', hours: 10 };
		let submittedReport;

		try {
			submitPocketReport(user.id, report, (userId, submittedData) => {
				assert.equal(userId, user.id);
				submittedReport = submittedData;
			});

			assert.equal(submittedReport, report);
		} finally {
			UsersList.list = originalUsers;
			CongregationsList.list = originalCongregations;
		}
	});
});
