import type { IncomingHttpHeaders } from 'node:http';

import { createApplicationUser } from '#modules/users/index.js';
import { UsersList } from '#modules/users/index.js';
import { AuthenticationError } from './authentication-error.js';
import {
	createAuthenticationToken,
	createAuthenticationUser,
	findAuthenticationUserIdByEmail,
} from './authentication-identity.service.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';
import { buildUserAuthenticationResponse } from './authentication-response.js';
import { createAuthenticationSession } from './authentication-session.service.js';
import {
	generateEmailOneTimePassword,
	isEmailOneTimePasswordValid,
} from './email-otp.js';

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
	let authenticationUserId = await findAuthenticationUserIdByEmail(request.email);
	let user = UsersList.findByEmail(request.email);

	if (!user && !authenticationUserId) {
		authenticationUserId = await createAuthenticationUser(request.email);
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
