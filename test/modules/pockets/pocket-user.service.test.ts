import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	PocketUserError,
	submitPocketReport,
} from '../../../src/modules/pockets/pocket-user.service.js';
import { User } from '../../../src/modules/users/user.js';
import { UsersList } from '../../../src/modules/users/users.js';

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
});
