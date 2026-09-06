import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	AuthenticationError,
	completeEmailOtpAuthentication,
	createPasswordlessSignIn,
} from '#modules/auth/index.js';
import { User } from '#modules/users/user.js';
import {
	hashSecretValue,
	isSecretValueMatchingHash,
} from '#platform/security/secret-comparison.js';

const currentTime = Date.parse('2026-09-03T10:00:00.000Z');
const emailContent = {
	subject: 'Sign in',
	title: 'Sign in',
	description: 'Use this secure sign-in link.',
	loginButtonLabel: 'Sign in',
	alternativeLinkText: 'Open the link',
	ignoreRequestText: 'Ignore this message if you did not request it.',
	oneTimePasswordLabel: 'One-time password',
	oneTimePasswordDurationText: 'Valid for five minutes',
};

const signInRequest = {
	email: 'jane@example.com',
	origin: 'https://organized.example.com',
	emailContent,
};

const otpCompletionInput = {
	email: signInRequest.email,
	oneTimePassword: '123456',
	visitorId: 'visitor-1',
	visitorIp: '192.0.2.1',
	headers: {},
};

const createUser = () => {
	const user = new User('user-1');
	user.email = signInRequest.email;
	user.profile.role = 'vip';
	user.profile.auth_uid = 'authentication-user-1';

	return user;
};

const hasAuthenticationErrorCode = (expectedCode: AuthenticationError['code']) => {
	return (error: unknown) => {
		return error instanceof AuthenticationError && error.code === expectedCode;
	};
};

describe('passwordless sign-in creation', () => {
	it('creates missing accounts, rotates the OTP, and sends the login email', async () => {
		const user = createUser();

		const result = await createPasswordlessSignIn(signInRequest, {
			findAuthenticationUserId: async () => undefined,
			findUserByEmail: () => undefined,
			createAuthenticationUser: async (email) => {
				assert.equal(email, signInRequest.email);
				return 'authentication-user-1';
			},
			createUser: async (params) => {
				assert.deepEqual(params, {
					auth_uid: 'authentication-user-1',
					firstname: '',
					lastname: '',
					email: signInRequest.email,
				});
				return user;
			},
			generateOneTimePassword: () => '123456',
			getCurrentTime: () => currentTime,
			updateProfile: async (target, profile) => {
				target.profile = profile;
			},
			createAuthenticationToken: async () => 'custom-token',
			isEmailEnabled: () => true,
			sendLoginEmail: (email) => {
				assert.equal(email.recipient, signInRequest.email);
				assert.equal(
					email.loginLink,
					'https://organized.example.com/#/?code=custom-token',
				);
				assert.equal(email.oneTimePassword, '123456');
				assert.equal(email.subject, emailContent.subject);
			},
		});

		assert.equal(user.profile.email_otp?.expiredAt, currentTime + 5 * 60 * 1000);
		assert.equal(isSecretValueMatchingHash(user.profile.email_otp!.code, '123456'), true);
		assert.deepEqual(result, {
			emailEnabled: true,
			link: 'https://organized.example.com/#/?code=custom-token',
			otp: '123456',
		});
	});

	it('rotates the OTP on every request without storing plaintext when mail is disabled', async () => {
		const user = createUser();
		user.profile.email_otp = {
			code: hashSecretValue('654321'),
			expiredAt: currentTime + 1,
		};

		const result = await createPasswordlessSignIn(signInRequest, {
			findAuthenticationUserId: async () => 'authentication-user-1',
			findUserByEmail: () => user,
			generateOneTimePassword: () => '999999',
			getCurrentTime: () => currentTime,
			updateProfile: async (target, profile) => {
				target.profile = profile;
			},
			createAuthenticationToken: async () => 'custom-token',
			isEmailEnabled: () => false,
			sendLoginEmail: () => {
				throw new Error('Email should not be sent when mail is disabled');
			},
		});

		assert.deepEqual(result, {
			emailEnabled: false,
			link: 'https://organized.example.com/#/?code=custom-token',
			otp: '999999',
		});
		assert.equal(user.profile.email_otp?.expiredAt, currentTime + 5 * 60 * 1000);
		assert.equal(isSecretValueMatchingHash(user.profile.email_otp!.code, '999999'), true);
	});

	it('rejects identities that exist in only one data store', async () => {
		const user = createUser();

		await assert.rejects(
			createPasswordlessSignIn(signInRequest, {
				findAuthenticationUserId: async () => undefined,
				findUserByEmail: () => user,
			}),
			hasAuthenticationErrorCode('USER_NOT_FOUND'),
		);
		await assert.rejects(
			createPasswordlessSignIn(signInRequest, {
				findAuthenticationUserId: async () => 'authentication-user-1',
				findUserByEmail: () => undefined,
			}),
			hasAuthenticationErrorCode('USER_NOT_FOUND'),
		);
	});
});

describe('email OTP authentication completion', () => {
	it('returns stable errors for missing users, missing OTPs, and invalid OTPs', async () => {
		const userWithoutOtp = createUser();
		const userWithOtp = createUser();
		userWithOtp.profile.email_otp = { code: hashSecretValue('123456'), expiredAt: currentTime + 1 };

		await assert.rejects(
			completeEmailOtpAuthentication(
				otpCompletionInput,
				{ findUserByEmail: () => undefined },
			),
			hasAuthenticationErrorCode('USER_NOT_FOUND'),
		);
		await assert.rejects(
			completeEmailOtpAuthentication(
				otpCompletionInput,
				{ findUserByEmail: () => userWithoutOtp },
			),
			hasAuthenticationErrorCode('OTP_NOT_FOUND'),
		);
		await assert.rejects(
			completeEmailOtpAuthentication(
				{
					...otpCompletionInput,
					oneTimePassword: '000000',
				},
				{
					findUserByEmail: () => userWithOtp,
					isOneTimePasswordValid: () => false,
				},
			),
			hasAuthenticationErrorCode('INVALID_OTP'),
		);
	});

	it('consumes a valid OTP and creates a verified session', async () => {
		const user = createUser();
		user.profile.firstname.value = 'Jane';
		user.profile.lastname.value = 'Doe';
		user.profile.email_otp = { code: hashSecretValue('123456'), expiredAt: currentTime + 1 };
		const originalProfile = user.profile;

		const result = await completeEmailOtpAuthentication(
			{
				email: signInRequest.email,
				oneTimePassword: '123456',
				visitorId: 'visitor-1',
				visitorIp: '192.0.2.1',
				headers: { 'user-agent': 'test browser' },
			},
			{
				findUserByEmail: () => user,
				isOneTimePasswordValid: (storedOtp, submittedOtp) => {
					assert.equal(storedOtp, originalProfile.email_otp);
					assert.equal(submittedOtp, '123456');
					return true;
				},
				updateProfile: async (target, profile) => {
					assert.notEqual(profile, originalProfile);
					assert.equal(profile.email_otp, undefined);
					target.profile = profile;
				},
				createSession: async (input) => {
					assert.deepEqual(input, {
						userId: user.id,
						visitorId: 'visitor-1',
						visitorIp: '192.0.2.1',
						headers: { 'user-agent': 'test browser' },
						mfaVerified: true,
					});
				},
				createAuthenticationToken: async (authenticationUserId) => {
					assert.equal(authenticationUserId, user.profile.auth_uid);
					return 'custom-token';
				},
			},
		);

		assert.equal(user.profile.email_otp, undefined);
		assert.equal(result.id, user.id);
		assert.equal(result.message, 'TOKEN_VALID');
		assert.equal(result.custom_token, 'custom-token');
	});
});
