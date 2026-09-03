import type { IncomingHttpHeaders } from 'node:http';

import {
	createApplicationUser,
	UsersList,
	updateUserProfile,
	type User,
	type UserNewParams,
	type UserProfile,
} from '#modules/users/index.js';
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

type CreatePasswordlessSignInDependencies = {
	findAuthenticationUserId: typeof findAuthenticationUserIdByEmail;
	findUserByEmail: (email: string) => User | undefined;
	createAuthenticationUser: typeof createAuthenticationUser;
	createUser: (params: UserNewParams) => Promise<User>;
	updateProfile: (user: User, profile: UserProfile) => Promise<void>;
	createAuthenticationToken: typeof createAuthenticationToken;
	isEmailEnabled: typeof isPasswordlessEmailEnabled;
	sendLoginEmail: typeof sendPasswordlessLoginEmail;
	generateOneTimePassword: typeof generateEmailOneTimePassword;
	getCurrentTime: () => number;
};

const defaultCreatePasswordlessSignInDependencies: CreatePasswordlessSignInDependencies = {
	findAuthenticationUserId: findAuthenticationUserIdByEmail,
	findUserByEmail: (email) => UsersList.findByEmail(email),
	createAuthenticationUser,
	createUser: createApplicationUser,
	updateProfile: updateUserProfile,
	createAuthenticationToken,
	isEmailEnabled: isPasswordlessEmailEnabled,
	sendLoginEmail: sendPasswordlessLoginEmail,
	generateOneTimePassword: generateEmailOneTimePassword,
	getCurrentTime: Date.now,
};

export const createPasswordlessSignIn = async (
	request: PasswordlessSignInRequest,
	dependencies: Partial<CreatePasswordlessSignInDependencies> = {},
) => {
	const {
		findAuthenticationUserId,
		findUserByEmail,
		createAuthenticationUser,
		createUser,
		updateProfile,
		createAuthenticationToken,
		isEmailEnabled,
		sendLoginEmail,
		generateOneTimePassword,
		getCurrentTime,
	} = {
		...defaultCreatePasswordlessSignInDependencies,
		...dependencies,
	};
	let authenticationUserId = await findAuthenticationUserId(request.email);
	let user = findUserByEmail(request.email);

	if (!user && !authenticationUserId) {
		authenticationUserId = await createAuthenticationUser(request.email);
		user = await createUser({
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
		? getCurrentTime() > user.profile.email_otp.expiredAt
		: true;

	if (oneTimePasswordExpired) {
		oneTimePassword = generateOneTimePassword();

		const profile = structuredClone(user.profile);
		profile.email_otp = {
			code: oneTimePassword,
			expiredAt: getCurrentTime() + 5 * 60 * 1000,
		};

		await updateProfile(user, profile);
	}

	const token = await createAuthenticationToken(authenticationUserId);
	const link = `${request.origin}/#/?code=${token}`;
	const emailEnabled = isEmailEnabled();

	if (emailEnabled) {
		sendLoginEmail({
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

type CompleteEmailOtpAuthenticationDependencies = {
	findUserByEmail: (email: string) => User | undefined;
	isOneTimePasswordValid: typeof isEmailOneTimePasswordValid;
	updateProfile: (user: User, profile: UserProfile) => Promise<void>;
	createSession: typeof createAuthenticationSession;
	createUserResponse: typeof buildUserAuthenticationResponse;
	createAuthenticationToken: typeof createAuthenticationToken;
};

const defaultCompleteEmailOtpAuthenticationDependencies: CompleteEmailOtpAuthenticationDependencies = {
	findUserByEmail: (email) => UsersList.findByEmail(email),
	isOneTimePasswordValid: isEmailOneTimePasswordValid,
	updateProfile: updateUserProfile,
	createSession: createAuthenticationSession,
	createUserResponse: buildUserAuthenticationResponse,
	createAuthenticationToken,
};

export const completeEmailOtpAuthentication = async (
	input: CompleteEmailOtpAuthenticationInput,
	dependencies: Partial<CompleteEmailOtpAuthenticationDependencies> = {},
) => {
	const {
		findUserByEmail,
		isOneTimePasswordValid,
		updateProfile,
		createSession,
		createUserResponse,
		createAuthenticationToken,
	} = {
		...defaultCompleteEmailOtpAuthenticationDependencies,
		...dependencies,
	};
	const user = findUserByEmail(input.email);
	if (!user) throw new AuthenticationError('USER_NOT_FOUND');
	if (!user.profile.email_otp) throw new AuthenticationError('OTP_NOT_FOUND');

	if (!isOneTimePasswordValid(user.profile.email_otp, input.oneTimePassword)) {
		throw new AuthenticationError('INVALID_OTP');
	}

	const profile = structuredClone(user.profile);
	delete profile.email_otp;
	await updateProfile(user, profile);

	await createSession({
		userId: user.id,
		visitorId: input.visitorId,
		visitorIp: input.visitorIp,
		headers: input.headers,
		mfaVerified: true,
	});

	const userInfo = createUserResponse({ authUser: user });
	userInfo.custom_token = await createAuthenticationToken(user.profile.auth_uid!);

	return userInfo;
};
