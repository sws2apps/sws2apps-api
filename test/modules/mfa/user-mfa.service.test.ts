import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	decryptUserMfaSecret,
	disableUserMfa,
	enableUserMfa,
	ensureUserMfaSecret,
	revokeUserMfa,
} from '#modules/mfa/user-mfa.service.js';
import { MfaSecretError } from '#modules/mfa/user-secret.js';
import { User } from '#modules/users/user.js';

const storedSecret = {
	secret: 'JBSWY3DPEHPK3PXP',
	uri: 'otpauth://totp/sws2apps:user@example.com',
	version: 2,
};

describe('user MFA secret lifecycle', () => {
	it('generates and persists a missing secret before publishing it', async () => {
		const user = new User('user-1');
		user.email = 'user@example.com';

		await ensureUserMfaSecret(user, {
			generateSecret: (email) => {
				assert.equal(email, user.email);
				return storedSecret;
			},
			encrypt: (plainText) => {
				assert.deepEqual(JSON.parse(plainText), storedSecret);
				return 'encrypted-secret';
			},
			updateProfile: async (target, profile) => {
				assert.equal(target.profile.secret, undefined);
				target.profile = profile;
			},
		});

		assert.equal(user.profile.secret, 'encrypted-secret');
	});

	it('does not generate another secret when one already exists', async () => {
		const user = new User('user-1');
		user.profile.secret = 'existing-secret';
		let generatedSecret = false;

		await ensureUserMfaSecret(user, {
			generateSecret: () => {
				generatedSecret = true;
				return storedSecret;
			},
		});

		assert.equal(generatedSecret, false);
		assert.equal(user.profile.secret, 'existing-secret');
	});

	it('requires an email before generating a secret', async () => {
		const user = new User('user-1');

		await assert.rejects(
			ensureUserMfaSecret(user),
			(error: unknown) => {
				return error instanceof MfaSecretError
					&& error.code === 'USER_EMAIL_REQUIRED';
			},
		);
	});

	it('validates decrypted secret data before returning it', () => {
		const user = new User('user-1');
		user.profile.secret = 'encrypted-secret';

		const result = decryptUserMfaSecret(user, {
			decrypt: () => JSON.stringify(storedSecret),
		});

		assert.deepEqual(result, storedSecret);
		assert.throws(
			() => decryptUserMfaSecret(user, { decrypt: () => '{invalid' }),
			MfaSecretError,
		);
	});

	it('enables and disables MFA through cloned profile updates', async () => {
		const user = new User('user-1');
		user.profile.secret = 'encrypted-secret';

		await enableUserMfa(user, {
			updateProfile: async (target, profile) => {
				assert.notEqual(profile, target.profile);
				assert.equal(target.profile.mfa_enabled, undefined);
				target.profile = profile;
			},
		});
		assert.equal(user.profile.mfa_enabled, true);

		await disableUserMfa(user, {
			updateProfile: async (target, profile) => {
				assert.equal(target.profile.mfa_enabled, true);
				target.profile = profile;
			},
		});

		assert.equal(user.profile.mfa_enabled, false);
		assert.equal(user.profile.secret, undefined);
	});

	it('disables MFA before revoking every active session', async () => {
		const user = new User('user-1');
		user.profile.mfa_enabled = true;
		user.profile.secret = 'encrypted-secret';
		const completedOperations: string[] = [];

		await revokeUserMfa(user, {
			updateProfile: async (target, profile) => {
				target.profile = profile;
				completedOperations.push('profile');
			},
			updateSessions: async (target, sessions) => {
				assert.equal(target.profile.mfa_enabled, false);
				target.sessions = sessions;
				completedOperations.push('sessions');
			},
		});

		assert.deepEqual(completedOperations, ['profile', 'sessions']);
		assert.deepEqual(user.sessions, []);
	});

	it('does not revoke sessions when disabling MFA fails', async () => {
		const user = new User('user-1');
		let sessionsUpdated = false;

		await assert.rejects(
			revokeUserMfa(user, {
				updateProfile: async () => {
					throw new Error('storage unavailable');
				},
				updateSessions: async () => {
					sessionsUpdated = true;
				},
			}),
			/storage unavailable/,
		);

		assert.equal(sessionsUpdated, false);
	});
});
