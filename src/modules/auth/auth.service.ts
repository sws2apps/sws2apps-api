import {
	createFirebaseAuthenticationUser,
	createFirebaseCustomToken,
	findFirebaseAuthenticationUserIdByEmail,
	getFirebaseUserDisplayName,
	verifyFirebaseIdToken,
} from '../../platform/firebase/authentication.js';
import randomstring from 'randomstring';
import type { IncomingHttpHeaders } from 'node:http';
import { env } from '../../config/env.js';
import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { retrieveVisitorDetails } from '../../platform/visitor-details/visitor-details.js';
import { CongregationsList } from '../congregations/congregations.js';
import type { User } from '../users/user.js';
import type { UserAuthResponse } from '../users/user.types.js';
import { UsersList } from '../users/users.js';
import { createApplicationUser } from '../users/user-creation.service.js';
import { generateDevelopmentMfaToken } from '../mfa/development-token.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';
import { isEmailOneTimePasswordValid } from './email-otp.js';

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

export const getVisitorSessionDetails = async (
	visitorIp: string,
	requestHeaders: IncomingHttpHeaders,
) => {
	return retrieveVisitorDetails(visitorIp, requestHeaders);
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
		oneTimePassword = randomstring.generate({ length: 6, charset: ['numeric'] });

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

type CreateAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	mfaVerified: boolean;
};

type RefreshAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
};

export const refreshAuthenticationSession = async (
	input: RefreshAuthenticationSessionInput,
): Promise<void> => {
	const user = UsersList.findById(input.userId)!;
	const sessions = structuredClone(user.sessions);
	const session = sessions.find((record) => record.visitorid === input.visitorId)!;

	session.last_seen = new Date().toISOString();
	session.visitor_details = await getVisitorSessionDetails(input.visitorIp, input.headers);

	await user.updateSessions(sessions);
};

export const createAuthenticationSession = async (input: CreateAuthenticationSessionInput): Promise<void> => {
	const user = UsersList.findById(input.userId)!;
	const sessions = user.sessions?.filter((session) => session.visitorid !== input.visitorId) || [];

	sessions.push({
		mfaVerified: input.mfaVerified,
		last_seen: new Date().toISOString(),
		visitorid: input.visitorId,
		visitor_details: await getVisitorSessionDetails(input.visitorIp, input.headers),
		identifier: crypto.randomUUID(),
	});

	await user.updateSessions(sessions);
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

type BuildUserAuthenticationResponseInput = {
	authUser: User;
	mfaStatus?: 'not_enabled' | 'enabled';
};

export const buildUserAuthenticationResponse = ({
	authUser,
	mfaStatus = 'not_enabled',
}: BuildUserAuthenticationResponseInput): UserAuthResponse => {
	const userInfo: UserAuthResponse = {
		message: 'TOKEN_VALID',
		id: authUser.id,
		app_settings: {
			user_settings: {
				firstname: authUser.profile.firstname,
				lastname: authUser.profile.lastname,
				role: authUser.profile.role,
				mfa: mfaStatus,
			},
		},
	};

	const congregationId = authUser.profile.congregation?.id;

	if (!congregationId) {
		return userInfo;
	}

	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		return userInfo;
	}

	const userRole = authUser.profile.congregation!.cong_role;
	const masterKeyNeeded = canAccessCongregationMasterKey(userRole);

	userInfo.app_settings.user_settings.user_local_uid = authUser.profile.congregation!.user_local_uid;
	userInfo.app_settings.user_settings.user_members_delegate = authUser.profile.congregation!.user_members_delegate;
	userInfo.app_settings.user_settings.cong_role = userRole;

	const midweek = congregation.settings.midweek_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));
	const weekend = congregation.settings.weekend_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));

	userInfo.app_settings.cong_settings = {
		id: congregationId,
		cong_circuit: congregation.settings.cong_circuit,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
		cong_access_code: congregation.settings.cong_access_code,
		cong_master_key: masterKeyNeeded ? congregation.settings.cong_master_key : undefined,
		cong_location: congregation.settings.cong_location,
		midweek_meeting: midweek,
		weekend_meeting: weekend,
	};

	return userInfo;
};
