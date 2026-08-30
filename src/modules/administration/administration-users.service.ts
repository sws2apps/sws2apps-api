import type { AppRoleType } from '../../domain/users/app-role.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import type { UserSession } from '../users/user.types.js';

export class AdministrationUserError extends Error {
	constructor(
		public readonly code:
			| 'USER_NOT_FOUND'
			| 'CONGREGATION_NOT_FOUND'
			| 'USER_ALREADY_MEMBER',
	) {
		super(code);
		this.name = 'AdministrationUserError';
	}
}

const getAdministrationUser = (userId: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new AdministrationUserError('USER_NOT_FOUND');
	return user;
};

const reloadUserCongregation = (congregationId: string | undefined) => {
	if (congregationId) void CongregationsList.findById(congregationId)?.reloadMembers();
};

export const formatAdministrationSession = (
	session: UserSession,
	currentVisitorId: string,
) => {
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
};

export const getAdministrationUsers = (currentVisitorId: string) => {
	return UsersList.list.map((user) => {
		const congregationId = user.profile.congregation?.id || '';
		const congregation = CongregationsList.findById(congregationId);
		const sessions = user.sessions?.map((session) =>
			formatAdministrationSession(session, currentVisitorId),
		);

		return {
			id: user.id,
			sessions: sessions || [],
			profile: {
				...user.profile,
				email: user.email,
				mfa_enabled: user.profile.mfa_enabled,
				global_role: user.profile.role,
				role: undefined,
				congregation: {
					...user.profile.congregation,
					country_code: congregation?.settings.country_code || '',
					cong_name: congregation?.settings.cong_name || '',
					cong_prefix: congregation?.settings.cong_prefix,
					cong_number: congregation?.settings.cong_number?.value || '',
				},
			},
		};
	});
};

export const logoutAdministrationUser = async (userId: string) => {
	const administrator = UsersList.findById(userId);
	if (administrator) await administrator.adminLogout();
};

export const deleteAdministrationUser = async (
	userId: string,
	currentVisitorId: string,
) => {
	const user = getAdministrationUser(userId);
	const congregationId = user.profile.congregation?.id;

	await UsersList.delete(userId);
	reloadUserCongregation(congregationId);

	return getAdministrationUsers(currentVisitorId);
};

export const disableAdministrationUserMfa = async (
	userId: string,
	currentVisitorId: string,
) => {
	await getAdministrationUser(userId).disableMFA();
	return getAdministrationUsers(currentVisitorId);
};

export const revokeAdministrationUserToken = async (
	userId: string,
	currentVisitorId: string,
) => {
	await getAdministrationUser(userId).revokeToken();
	return getAdministrationUsers(currentVisitorId);
};

type UpdateAdministrationUserInput = {
	firstname: string;
	lastname: string;
	email: string;
	roles: AppRoleType[];
};

export const updateAdministrationUser = async (
	userId: string,
	input: UpdateAdministrationUserInput,
	currentVisitorId: string,
) => {
	const user = getAdministrationUser(userId);
	const savedRoles = user.profile.congregation?.cong_role || [];
	const rolesUnchanged =
		input.roles.length === savedRoles.length &&
		input.roles.every((role) => savedRoles.includes(role));
	const nameChanged =
		user.profile.firstname.value !== input.firstname ||
		user.profile.lastname.value !== input.lastname;

	if (nameChanged || !rolesUnchanged) {
		const profile = structuredClone(user.profile);
		profile.firstname.value = input.firstname;
		profile.lastname.value = input.lastname;

		if (profile.congregation) profile.congregation.cong_role = input.roles;
		await user.updateProfile(profile);
	}

	if (input.email.length > 0 && input.email !== user.email && user.profile.auth_uid) {
		await user.updateEmailAuth(user.profile.auth_uid, input.email);
	}

	reloadUserCongregation(user.profile.congregation?.id);
	return getAdministrationUsers(currentVisitorId);
};

export const revokeAdministrationUserSession = async (
	userId: string,
	identifiers: string | [],
	currentVisitorId: string,
) => {
	const user = getAdministrationUser(userId);
	const session = identifiers.length === 0 ? [] : identifiers.at(0);

	if (typeof session === 'string') await user.revokeSession(session);
	if (typeof session === 'object') await user.updateSessions([]);

	reloadUserCongregation(user.profile.congregation?.id);
	return getAdministrationUsers(currentVisitorId);
};

export const assignAdministrationUserCongregation = async (
	userId: string,
	congregationId: string,
	currentVisitorId: string,
) => {
	const user = getAdministrationUser(userId);
	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		throw new AdministrationUserError('CONGREGATION_NOT_FOUND');
	}

	if (congregation.hasMember(user.id)) {
		throw new AdministrationUserError('USER_ALREADY_MEMBER');
	}

	await user.assignCongregation({ congId: congregationId, role: ['admin'] });
	return getAdministrationUsers(currentVisitorId);
};

export const removeAdministrationUserCongregation = async (
	userId: string,
	currentVisitorId: string,
) => {
	const user = getAdministrationUser(userId);
	const congregationId = user.profile.congregation?.id;

	if (user.profile.role === 'vip') {
		await user.removeCongregation();
	}

	if (user.profile.role === 'pocket') {
		await UsersList.delete(user.id);
	}

	reloadUserCongregation(congregationId);
	return getAdministrationUsers(currentVisitorId);
};
