import { env } from '#config/env.js';
import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { generateDevelopmentMfaToken } from '#modules/mfa/index.js';
import { UsersList } from '../users.js';
import { deleteUser } from './user-lifecycle.service.js';
import {
	decryptUserMfaSecret,
	disableUserMfa as disableMfaForUser,
	ensureUserMfaSecret,
} from '#modules/mfa/index.js';
import { refreshCongregationMembers } from '#modules/congregations/index.js';
import type { User } from '../user.js';
import type { UserSession } from '../types/user.types.js';

export type UserAccountErrorCode = 'CONGREGATION_NOT_ASSIGNED' | 'CONGREGATION_NOT_FOUND';

export class UserAccountError extends Error {
	constructor(public readonly code: UserAccountErrorCode) {
		super(code);
		this.name = 'UserAccountError';
	}
}

export const projectUserSessions = (
	sessions: UserSession[],
	currentVisitorId: string,
) => {
	return sessions.map((session) => {
		return {
			identifier: session.identifier,
			isSelf: session.visitorid === currentVisitorId,
			ip: session.visitor_details.ip,
			country_name: session.visitor_details.ipLocation.country_name,
			device: {
				browserName: session.visitor_details.browser,
				os: session.visitor_details.os,
				isMobile: session.visitor_details.isMobile,
			},
			last_seen: session.last_seen,
		};
	});
};

export const findSessionIdentifierByVisitorId = (
	sessions: UserSession[],
	visitorId: string,
): string | undefined => {
	return sessions.find((session) => session.visitorid === visitorId)?.identifier;
};

export const revokeSessionForUser = async (
	user: User,
	sessionIdentifier: string,
) => {
	const revokedSession = user.sessions.find(
		(session) => session.identifier === sessionIdentifier,
	)!;
	const remainingSessions = user.sessions.filter(
		(session) => session.identifier !== sessionIdentifier,
	);

	await user.updateSessions(remainingSessions);

	return projectUserSessions(user.sessions, revokedSession.visitorid);
};

export const getValidatedUserAccount = (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	if (!congregationId) throw new UserAccountError('CONGREGATION_NOT_ASSIGNED');

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new UserAccountError('CONGREGATION_NOT_FOUND');

	const congregationRole = user.profile.congregation!.cong_role;

	return {
		id: user.id,
		mfa: user.profile.mfa_enabled,
		cong_id: congregation.id,
		country_code: congregation.settings.country_code,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		cong_role: congregationRole,
		user_local_uid: user.profile.congregation!.user_local_uid,
		user_delegates: user.profile.congregation!.user_members_delegate,
		cong_master_key: canAccessCongregationMasterKey(congregationRole)
			? congregation.settings.cong_master_key
			: undefined,
		cong_access_code: congregation.settings.cong_access_code,
	};
};

export const getUserMfaEnrollment = async (userId: string) => {
	const user = UsersList.findById(userId)!;
	await ensureUserMfaSecret(user);

	const { secret, uri } = decryptUserMfaSecret(user);
	const developmentCode = !user.profile.mfa_enabled && env.isDevelopment
		? generateDevelopmentMfaToken(user.email!, user.profile.secret!)
		: undefined;

	return {
		secret,
		qrCode: uri,
		mfaEnabled: user.profile.mfa_enabled,
		MFA_CODE: developmentCode,
	};
};

export const getUserActiveSessions = (userId: string, currentVisitorId: string) => {
	const user = UsersList.findById(userId)!;
	return projectUserSessions(user.sessions, currentVisitorId);
};

export const revokeUserSession = async (userId: string, sessionIdentifier: string) => {
	const user = UsersList.findById(userId)!;
	const sessions = await revokeSessionForUser(user, sessionIdentifier);
	const congregationId = user.profile.congregation?.id;

	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;
	if (congregation) refreshCongregationMembers(congregation);

	return sessions;
};

export const logoutUserSession = async (userId: string | undefined, visitorId: string) => {
	if (!userId) return;
	const user = UsersList.findById(userId);
	if (!user) return;

	const sessionIdentifier = findSessionIdentifierByVisitorId(
		user.sessions,
		visitorId,
	);

	if (sessionIdentifier) {
		await revokeSessionForUser(user, sessionIdentifier);
	}
};

export const clearUserSessions = async (userId: string): Promise<void> => {
	await UsersList.findById(userId)?.updateSessions([]);
};

export const disableUserMfa = async (userId: string) => {
	await disableMfaForUser(UsersList.findById(userId)!);
};

export const deleteUserAccount = async (userId: string) => {
	await deleteUser(userId);
};
