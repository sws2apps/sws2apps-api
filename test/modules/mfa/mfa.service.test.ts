import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	InvalidMfaTokenError,
	verifyMfaToken,
} from '../../../src/modules/mfa/mfa.service.js';
import { User } from '../../../src/modules/users/user.js';
import { UsersList } from '../../../src/modules/users/users.js';
import { encryptData } from '../../../src/platform/encryption/encryption.js';

describe('MFA verification service', () => {
	it('rejects an invalid token before changing user state', async () => {
		const originalUsers = UsersList.list;
		const user = new User('user-1');
		user.email = 'user@example.test';
		user.profile.secret = encryptData(JSON.stringify({
			secret: 'JBSWY3DPEHPK3PXP',
			uri: 'otpauth://totp/test',
			version: 2,
		}));
		UsersList.list = [user];

		try {
			await assert.rejects(
				verifyMfaToken({
					userId: user.id,
					sessions: [],
					visitorId: 'visitor-1',
					token: 'not-a-token',
				}),
				InvalidMfaTokenError,
			);

			assert.equal(user.profile.mfa_enabled, undefined);
			assert.deepEqual(user.sessions, []);
		} finally {
			UsersList.list = originalUsers;
		}
	});
});
