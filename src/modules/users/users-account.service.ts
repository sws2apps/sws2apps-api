import { env } from '../../config/env.js';
import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { CongregationsList } from '../congregations/congregations.js';
import { generateDevelopmentMfaToken } from '../mfa/development-token.js';
import { UsersList } from './users.js';
import { deleteUser } from './user-lifecycle.service.js';

export type UserAccountErrorCode = 'CONGREGATION_NOT_ASSIGNED' | 'CONGREGATION_NOT_FOUND';

export class UserAccountError extends Error {
	constructor(public readonly code: UserAccountErrorCode) {
		super(code);
		this.name = 'UserAccountError';
	}
}

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
	await user.generateSecret();

	const { secret, uri } = user.decryptSecret();
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
	return UsersList.findById(userId)!.getActiveSessions(currentVisitorId);
};

export const revokeUserSession = async (userId: string, sessionIdentifier: string) => {
	const user = UsersList.findById(userId)!;
	const sessions = await user.revokeSession(sessionIdentifier);
	const congregationId = user.profile.congregation?.id;

	if (congregationId) CongregationsList.findById(congregationId)?.reloadMembers();

	return sessions;
};

export const logoutUserSession = async (userId: string | undefined, visitorId: string) => {
	if (!userId) return;
	await UsersList.findById(userId)?.revokeSession(visitorId);
};

export const disableUserMfa = async (userId: string) => {
	await UsersList.findById(userId)!.disableMFA();
};

export const deleteUserAccount = async (userId: string) => {
	await deleteUser(userId);
};
