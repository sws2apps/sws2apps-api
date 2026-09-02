import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	AuthenticationError,
	completeAuthentication,
} from '#modules/auth/index.js';
import type { UserNewParams } from '#modules/users/index.js';
import { User } from '#modules/users/user.js';

const createUser = (id = 'user-1') => {
	const user = new User(id);
	user.profile.role = 'vip';
	user.profile.auth_uid = 'authentication-user-1';
	user.profile.firstname = { value: 'Jane', updatedAt: '' };
	user.profile.lastname = { value: 'Doe', updatedAt: '' };

	return user;
};

describe('authentication completion', () => {
	it('rejects an unknown identity when account creation is not allowed', async () => {
		await assert.rejects(
			completeAuthentication(
				{
					authenticationUserId: 'missing-authentication-user',
					visitorId: 'visitor-1',
					visitorIp: '192.0.2.1',
					headers: {},
				},
				{
					findUserByAuthenticationId: () => undefined,
				},
			),
			(error: unknown) => {
				return error instanceof AuthenticationError && error.code === 'USER_NOT_FOUND';
			},
		);
	});

	it('creates an allowed missing account from the authentication display name', async () => {
		let newUserParams: UserNewParams | undefined;
		const user = createUser();

		const result = await completeAuthentication(
			{
				authenticationUserId: 'authentication-user-1',
				visitorId: 'visitor-1',
				visitorIp: '192.0.2.1',
				headers: { 'user-agent': 'test browser' },
				createUserWhenMissing: true,
			},
			{
				findUserByAuthenticationId: () => undefined,
				getAuthenticationDisplayName: async () => 'Jane Mary Doe',
				createUser: async (params) => {
					newUserParams = params;
					return user;
				},
				createSession: async (input) => {
					assert.deepEqual(input, {
						userId: user.id,
						visitorId: 'visitor-1',
						visitorIp: '192.0.2.1',
						headers: { 'user-agent': 'test browser' },
						mfaVerified: false,
					});
				},
				isDevelopment: false,
			},
		);

		assert.deepEqual(newUserParams, {
			auth_uid: 'authentication-user-1',
			firstname: 'Jane Mary',
			lastname: 'Doe',
		});
		assert.equal(result.requiresMfa, false);
		assert.equal(result.userInfo.id, user.id);
	});

	it('creates an unverified session before requiring MFA', async () => {
		const user = createUser();
		user.email = 'jane@example.com';
		user.profile.mfa_enabled = true;
		user.profile.secret = 'encrypted-secret';
		let sessionMfaVerified: boolean | undefined;

		const result = await completeAuthentication(
			{
				authenticationUserId: 'authentication-user-1',
				visitorId: 'visitor-1',
				visitorIp: '192.0.2.1',
				headers: {},
			},
			{
				findUserByAuthenticationId: () => user,
				createSession: async (input) => {
					sessionMfaVerified = input.mfaVerified;
				},
				createDevelopmentMfaToken: (email, encryptedSecret) => {
					assert.equal(email, user.email);
					assert.equal(encryptedSecret, user.profile.secret);

					return 'development-mfa-code';
				},
				isDevelopment: true,
			},
		);

		assert.equal(sessionMfaVerified, false);
		assert.deepEqual(result, {
			requiresMfa: true,
			developmentMfaCode: 'development-mfa-code',
		});
	});
});
