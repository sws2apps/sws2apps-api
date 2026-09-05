import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	deletePocketAccount,
	getPocketUserSessions,
	PocketUserError,
	revokePocketUserSession,
	submitPocketReport,
} from '#modules/pockets/pocket-user.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('Pocket user service', () => {
	it('rejects a report when the user has no congregation', async () => {
		const originalUsers = UsersList.list;
		const user = new User('user-1');
		UsersList.list = [user];

		try {
			await assert.rejects(
				submitPocketReport(user.id, { report_month: '2026/08' }),
				(error: unknown) =>
					error instanceof PocketUserError && error.code === 'CONGREGATION_NOT_FOUND',
			);
		} finally {
			UsersList.list = originalUsers;
		}
	});

	it('submits a report for a user assigned to an existing congregation', async () => {
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
			await submitPocketReport(user.id, report, async (userId, submittedData) => {
				assert.equal(userId, user.id);
				submittedReport = submittedData;
			});

			assert.equal(submittedReport, report);
		} finally {
			UsersList.list = originalUsers;
			CongregationsList.list = originalCongregations;
		}
	});

	it('propagates report persistence failures', async () => {
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

		try {
			await assert.rejects(
				submitPocketReport(user.id, {}, async () => {
					throw new Error('storage unavailable');
				}),
				/storage unavailable/,
			);
		} finally {
			UsersList.list = originalUsers;
			CongregationsList.list = originalCongregations;
		}
	});
});

describe('Pocket account lifecycle', () => {
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

	it('returns a stable error when the Pocket user does not exist', () => {
		assert.throws(
			() => getPocketUserSessions('missing-user', 'visitor-1'),
			(error: unknown) => {
				return error instanceof PocketUserError
					&& error.code === 'USER_NOT_FOUND';
			},
		);
	});

	it('translates a missing session into a Pocket domain error', async () => {
		const user = new User('user-1');
		UsersList.list = [user];

		await assert.rejects(
			revokePocketUserSession(user.id, 'missing-session'),
			(error: unknown) => {
				return error instanceof PocketUserError
					&& error.code === 'SESSION_NOT_FOUND';
			},
		);
	});

	it('refreshes congregation members only after account deletion succeeds', async () => {
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		user.profile.congregation = {
			id: congregation.id,
			cong_role: ['publisher'],
			account_type: 'pocket',
		};
		UsersList.list = [user];
		CongregationsList.list = [congregation];
		const completedOperations: string[] = [];

		await deletePocketAccount(user.id, {
			deleteAccount: async (userId) => {
				assert.equal(userId, user.id);
				completedOperations.push('delete');
			},
			refreshMembers: (target) => {
				assert.equal(target, congregation);
				completedOperations.push('refresh');
			},
		});

		assert.deepEqual(completedOperations, ['delete', 'refresh']);
	});

	it('does not refresh congregation members when account deletion fails', async () => {
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		user.profile.congregation = {
			id: congregation.id,
			cong_role: ['publisher'],
			account_type: 'pocket',
		};
		UsersList.list = [user];
		CongregationsList.list = [congregation];
		let membersRefreshed = false;

		await assert.rejects(
			deletePocketAccount(user.id, {
				deleteAccount: async () => {
					throw new Error('identity unavailable');
				},
				refreshMembers: () => {
					membersRefreshed = true;
				},
			}),
			/identity unavailable/,
		);

		assert.equal(membersRefreshed, false);
	});
});
