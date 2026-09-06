import { env } from '#config/env.js';
import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import {
	CongregationsList,
	refreshCongregationMembers,
} from '#modules/congregations/index.js';
import { registerInstallation } from '#modules/installations/index.js';
import {
	generateDevelopmentMfaToken,
	decryptUserMfaSecret,
	disableUserMfa as disableMfaForUser,
	ensureUserMfaSecret,
} from '#modules/mfa/index.js';
import { LogLevel } from '@logtail/types';
import { logger } from '#platform/logging/logger.js';
import { UsersList } from '../users.js';
import { deleteUser } from './user-lifecycle.service.js';
import type { User } from '../user.js';
import type { UserSession } from '../types/user.types.js';
import { updateUserSessions } from './user-data.service.js';

export type UserAccountErrorCode =
	| 'USER_NOT_FOUND'
	| 'SESSION_NOT_FOUND'
	| 'CONGREGATION_NOT_ASSIGNED'
	| 'CONGREGATION_NOT_FOUND';

export class UserAccountError extends Error {
	constructor(public readonly code: UserAccountErrorCode) {
		super(code);
		this.name = 'UserAccountError';
	}
}

type UserAccountOperations = {
	updateSessions: typeof updateUserSessions;
	registerInstallation: typeof registerInstallation;
};

const defaultUserAccountOperations: UserAccountOperations = {
	updateSessions: updateUserSessions,
	registerInstallation,
};

const getUserAccountUser = (userId: string): User => {
	const user = UsersList.findById(userId);
	if (!user) throw new UserAccountError('USER_NOT_FOUND');
	return user;
};

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
	operations: Partial<UserAccountOperations> = {},
) => {
	const revokedSession = user.sessions.find(
		(session) => session.identifier === sessionIdentifier,
	);
	if (!revokedSession) throw new UserAccountError('SESSION_NOT_FOUND');

	const remainingSessions = user.sessions.filter(
		(session) => session.identifier !== sessionIdentifier,
	);
	const { updateSessions } = { ...defaultUserAccountOperations, ...operations };

	await updateSessions(user, remainingSessions);

	return projectUserSessions(user.sessions, revokedSession.visitorid);
};

export const getValidatedUserAccount = (userId: string) => {
	const user = getUserAccountUser(userId);
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

// Best-effort bookkeeping, not part of the validation contract: map the
// calling application installation to the authenticated account so the public
// feature-flag endpoint can resolve user and congregation scoping without
// trusting a caller-supplied identity header.
export const bindInstallationToUser = async (
	userId: string,
	installationId: string | undefined,
	operations: Partial<UserAccountOperations> = {},
): Promise<void> => {
	if (!installationId) return;

	const { registerInstallation: registerInstallationForUser } = {
		...defaultUserAccountOperations,
		...operations,
	};

	try {
		await registerInstallationForUser(installationId, userId);
	} catch {
		logger(LogLevel.Warn, 'failed to link application installation to user account', {
			userId,
			installationId,
		});
	}
};

export const getUserMfaEnrollment = async (userId: string) => {
	const user = getUserAccountUser(userId);
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
	const user = getUserAccountUser(userId);
	return projectUserSessions(user.sessions, currentVisitorId);
};

export const revokeUserSession = async (userId: string, sessionIdentifier: string) => {
	const user = getUserAccountUser(userId);
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
	const user = UsersList.findById(userId);
	if (user) await updateUserSessions(user, []);
};

export const disableUserMfa = async (userId: string) => {
	await disableMfaForUser(getUserAccountUser(userId));
};

export const deleteUserAccount = async (userId: string) => {
	await deleteUser(userId);
};
