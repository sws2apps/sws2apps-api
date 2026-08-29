import {
	createFirebaseCustomToken,
	getFirebaseUserDisplayName,
	verifyFirebaseIdToken,
} from '../../platform/firebase/authentication.js';
import type { IncomingHttpHeaders } from 'node:http';
import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { retrieveVisitorDetails } from '../../platform/visitor-details/visitor-details.js';
import { CongregationsList } from '../congregations/congregations.js';
import type { User } from '../users/user.js';
import type { UserAuthResponse } from '../users/user.types.js';
import { UsersList } from '../users/users.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';

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
	const { link, otp } = await UsersList.generatePasswordLessLink({
		email: request.email,
		origin: request.origin,
	});
	const emailEnabled = isPasswordlessEmailEnabled();

	if (emailEnabled) {
		sendPasswordlessLoginEmail({
			recipient: request.email,
			loginLink: link,
			oneTimePassword: otp,
			...request.emailContent,
		});
	}

	return { emailEnabled, link, otp };
};

type CreateAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	mfaVerified: boolean;
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
