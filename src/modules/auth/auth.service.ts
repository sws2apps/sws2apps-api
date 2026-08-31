import {
	createFirebaseAuthenticationUser,
	createFirebaseCustomToken,
	findFirebaseAuthenticationUserIdByEmail,
	getFirebaseUserDisplayName,
	verifyFirebaseIdToken,
} from '../../platform/firebase/authentication.js';
import type { IncomingHttpHeaders } from 'node:http';
import { env } from '../../config/env.js';
import { UsersList } from '../users/users.js';
import { createApplicationUser } from '../users/user-creation.service.js';
import { generateDevelopmentMfaToken } from '../mfa/development-token.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';
import {
	generateEmailOneTimePassword,
	isEmailOneTimePasswordValid,
} from './email-otp.js';
import { buildUserAuthenticationResponse } from './authentication-response.js';
import { createAuthenticationSession } from './authentication-session.service.js';

export type AuthenticationErrorCode = 'USER_NOT_FOUND' | 'OTP_NOT_FOUND' | 'INVALID_OTP';

export class AuthenticationError extends Error {
	constructor(public readonly code: AuthenticationErrorCode) {
		super(code);
		this.name = 'AuthenticationError';
	}
}

export const verifyAuthenticationToken = async (
	idToken: string,
): Promise<string | undefined> => {
	return verifyFirebaseIdToken(idToken);
};

export const getAuthenticationUserDisplayName = async (
	authenticationUserId: string,
): Promise<string> => {
	return getFirebaseUserDisplayName(authenticationUserId);
};

export const createAuthenticationToken = async (
	authenticationUserId: string,
): Promise<string> => {
	return createFirebaseCustomToken(authenticationUserId);
};

type PasswordlessSignInRequest = {
	email: string;
	origin: string;
	emailContent: {
		subject: string;
		title: string;
		description: string;
		loginButtonLabel: string;
		alternativeLinkText: string;
		ignoreRequestText: string;
		oneTimePasswordLabel: string;
		oneTimePasswordDurationText: string;
	};
};

export const createPasswordlessSignIn = async (request: PasswordlessSignInRequest) => {
	let authenticationUserId = await findFirebaseAuthenticationUserIdByEmail(request.email);
	let user = UsersList.findByEmail(request.email);

	if (!user && !authenticationUserId) {
		authenticationUserId = await createFirebaseAuthenticationUser(request.email);
		user = await createApplicationUser({
			auth_uid: authenticationUserId,
			firstname: '',
			lastname: '',
			email: request.email,
		});
	}

	if (!user || !authenticationUserId) {
		throw new AuthenticationError('USER_NOT_FOUND');
	}

	let oneTimePassword = user.profile.email_otp?.code;
	const oneTimePasswordExpired = user.profile.email_otp
		? Date.now() > user.profile.email_otp.expiredAt
		: true;

	if (oneTimePasswordExpired) {
		oneTimePassword = generateEmailOneTimePassword();

		const profile = structuredClone(user.profile);
		profile.email_otp = {
			code: oneTimePassword,
			expiredAt: Date.now() + 5 * 60 * 1000,
		};

		await user.updateProfile(profile);
	}

	const token = await createAuthenticationToken(authenticationUserId);
	const link = `${request.origin}/#/?code=${token}`;
	const emailEnabled = isPasswordlessEmailEnabled();

	if (emailEnabled) {
		sendPasswordlessLoginEmail({
			recipient: request.email,
			loginLink: link,
			oneTimePassword,
			...request.emailContent,
		});
	}

	return { emailEnabled, link, otp: oneTimePassword };
};

type CompleteAuthenticationInput = {
	authenticationUserId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	createUserWhenMissing?: boolean;
};

export const completeAuthentication = async (input: CompleteAuthenticationInput) => {
	let user = UsersList.findByAuthUid(input.authenticationUserId);

	if (!user && input.createUserWhenMissing) {
		const displayName = await getAuthenticationUserDisplayName(input.authenticationUserId);
		const names = displayName.length > 0 ? displayName.split(' ') : [];
		const lastname = names.pop() || '';
		const firstname = names.join(' ');

		user = await createApplicationUser({
			auth_uid: input.authenticationUserId,
			firstname,
			lastname,
		});
	}

	if (!user) throw new AuthenticationError('USER_NOT_FOUND');

	await createAuthenticationSession({
		userId: user.id,
		visitorId: input.visitorId,
		visitorIp: input.visitorIp,
		headers: input.headers,
		mfaVerified: false,
	});

	if (user.profile.mfa_enabled) {
		const developmentMfaCode = env.isDevelopment
			? generateDevelopmentMfaToken(user.email!, user.profile.secret!)
			: undefined;

		return {
			requiresMfa: true as const,
			developmentMfaCode,
		};
	}

	return {
		requiresMfa: false as const,
		userInfo: buildUserAuthenticationResponse({ authUser: user }),
	};
};

type CompleteEmailOtpAuthenticationInput = {
	email: string;
	oneTimePassword: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
};

export const completeEmailOtpAuthentication = async (
	input: CompleteEmailOtpAuthenticationInput,
) => {
	const user = UsersList.findByEmail(input.email);
	if (!user) throw new AuthenticationError('USER_NOT_FOUND');
	if (!user.profile.email_otp) throw new AuthenticationError('OTP_NOT_FOUND');

	if (!isEmailOneTimePasswordValid(user.profile.email_otp, input.oneTimePassword)) {
		throw new AuthenticationError('INVALID_OTP');
	}

	const profile = structuredClone(user.profile);
	delete profile.email_otp;
	await user.updateProfile(profile);

	await createAuthenticationSession({
		userId: user.id,
		visitorId: input.visitorId,
		visitorIp: input.visitorIp,
		headers: input.headers,
		mfaVerified: true,
	});

	const userInfo = buildUserAuthenticationResponse({ authUser: user });
	userInfo.custom_token = await createAuthenticationToken(user.profile.auth_uid!);

	return userInfo;
};
