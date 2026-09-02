import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as OTPAuth from 'otpauth';

import {
	InvalidMfaTokenError,
	verifyMfaToken,
} from '#modules/mfa/mfa.service.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import { encryptData } from '#platform/encryption/encryption.js';

const secret = 'JBSWY3DPEHPK3PXP';

const createEncryptedSecret = () => encryptData(JSON.stringify({
	secret,
	uri: 'otpauth://totp/test',
	version: 2,
}));

describe('MFA verification service', () => {
	it('rejects an invalid token before changing user state', async () => {
		const originalUsers = UsersList.list;
		const user = new User('user-1');
		user.email = 'user@example.test';
		user.profile.secret = createEncryptedSecret();
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

	it('enables MFA and verifies the active session for a valid token', async () => {
		const originalUsers = UsersList.list;
		const user = new User('user-1');
		user.email = 'user@example.test';
		user.profile.firstname.value = 'Jane';
		user.profile.lastname.value = 'Doe';
		user.profile.secret = createEncryptedSecret();
		const session = {
			identifier: 'session-1',
			visitorid: 'visitor-1',
			last_seen: '2026-01-01T00:00:00.000Z',
			visitor_details: {
				browser: 'Firefox',
				ip: '192.0.2.1',
				ipLocation: {
					city: 'Antananarivo',
					continent_code: 'AF',
					country_code: 'MDG',
					country_name: 'Madagascar',
					timezone: 'Indian/Antananarivo',
				},
				isMobile: false,
				os: 'Windows',
			},
		};
		user.sessions = [session];
		UsersList.list = [user];
		const tokenGenerator = new OTPAuth.TOTP({
			issuer: 'Organized-test',
			label: user.email,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: OTPAuth.Secret.fromBase32(secret),
		});

		try {
			const result = await verifyMfaToken(
				{
					userId: user.id,
					sessions: user.sessions,
					visitorId: session.visitorid,
					token: tokenGenerator.generate(),
				},
				{
					enableMfa: async (target) => {
						target.profile.mfa_enabled = true;
					},
					saveSessions: async (target, sessions) => {
						target.sessions = sessions;
					},
					getCurrentTime: () => new Date('2026-09-02T10:00:00.000Z'),
				},
			);

			assert.equal(result.message, 'TOKEN_VALID');
			assert.equal(result.app_settings.user_settings.mfa, 'enabled');
			assert.equal(user.profile.mfa_enabled, true);
			assert.equal(user.sessions[0]?.mfaVerified, true);
			assert.equal(user.sessions[0]?.last_seen, '2026-09-02T10:00:00.000Z');
			assert.equal('mfaVerified' in session, false);
		} finally {
			UsersList.list = originalUsers;
		}
	});
});
