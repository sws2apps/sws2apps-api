import type { AppRoleType } from '#domain/users/app-role.js';
import { encryptData } from '#platform/encryption/encryption.js';
import {
	type Congregation,
	refreshCongregationMembers,
} from '#modules/congregations/index.js';
import type { User } from '../user.js';
import {
	saveUserBibleStudies,
	saveUserDelegatedFieldServiceReports,
	saveUserFieldServiceReports,
	updateUserProfile,
	updateUserSessions,
	updateUserSettings,
} from './user-data.service.js';

export type UserCongregationMembershipOperations = {
	updateProfile: typeof updateUserProfile;
	updateSettings: typeof updateUserSettings;
	updateSessions: typeof updateUserSessions;
	saveFieldServiceReports: typeof saveUserFieldServiceReports;
	saveBibleStudies: typeof saveUserBibleStudies;
	saveDelegatedFieldServiceReports: typeof saveUserDelegatedFieldServiceReports;
	refreshMembers: typeof refreshCongregationMembers;
	encryptInvitationCode: typeof encryptData;
	getCurrentTimestamp: () => string;
};

const defaultMembershipOperations: UserCongregationMembershipOperations = {
	updateProfile: (user, profile) => updateUserProfile(user, profile),
	updateSettings: (user, settings) => updateUserSettings(user, settings),
	updateSessions: (user, sessions) => updateUserSessions(user, sessions),
	saveFieldServiceReports: (user, reports) => saveUserFieldServiceReports(user, reports),
	saveBibleStudies: (user, studies) => saveUserBibleStudies(user, studies),
	saveDelegatedFieldServiceReports: (user, reports) => {
		return saveUserDelegatedFieldServiceReports(user, reports);
	},
	refreshMembers: (congregation) => refreshCongregationMembers(congregation),
	encryptInvitationCode: (invitationCode) => encryptData(invitationCode),
	getCurrentTimestamp: () => new Date().toISOString(),
};

const resolveMembershipOperations = (
	overrides: Partial<UserCongregationMembershipOperations>,
): UserCongregationMembershipOperations => ({
	...defaultMembershipOperations,
	...overrides,
});

type AssignUserToCongregationInput = {
	role: AppRoleType[];
	person_uid?: string;
	firstname?: string;
	lastname?: string;
};

export const assignUserToCongregation = async (
	user: User,
	congregation: Congregation,
	input: AssignUserToCongregationInput,
	operations: Partial<UserCongregationMembershipOperations> = {},
): Promise<void> => {
	const membership = resolveMembershipOperations(operations);
	const profile = structuredClone(user.profile);

	profile.congregation = {
		id: congregation.id,
		cong_role: input.role,
		account_type: 'vip',
	};

	if (input.firstname) {
		profile.firstname = {
			value: input.firstname,
			updatedAt: membership.getCurrentTimestamp(),
		};
	}

	if (input.lastname) {
		profile.lastname = {
			value: input.lastname,
			updatedAt: membership.getCurrentTimestamp(),
		};
	}

	if (input.person_uid) {
		profile.congregation.user_local_uid = input.person_uid;
	}

	await membership.updateProfile(user, profile);
	membership.refreshMembers(congregation);
};

type UpdateUserCongregationInput = {
	roles: AppRoleType[];
	personUid?: string;
	personDelegates?: string[];
	pocketInvitationCode?: string;
};

export const updateUserCongregationMembership = async (
	user: User,
	congregation: Congregation,
	input: UpdateUserCongregationInput,
	operations: Partial<UserCongregationMembershipOperations> = {},
): Promise<void> => {
	const membership = resolveMembershipOperations(operations);
	const profile = structuredClone(user.profile);
	profile.congregation!.cong_role = input.roles;

	if (input.personUid) {
		profile.congregation!.user_local_uid = input.personUid;
	}

	if (input.personDelegates) {
		profile.congregation!.user_members_delegate = input.personDelegates;
	}

	if (input.pocketInvitationCode) {
		profile.congregation!.pocket_invitation_code = membership.encryptInvitationCode(
			input.pocketInvitationCode,
		);
	}

	await membership.updateProfile(user, profile);
	membership.refreshMembers(congregation);
};

export const removeUserPocketInvitation = async (
	user: User,
	congregation: Congregation,
	operations: Partial<UserCongregationMembershipOperations> = {},
): Promise<void> => {
	const membership = resolveMembershipOperations(operations);
	const profile = structuredClone(user.profile);
	profile.congregation!.pocket_invitation_code = undefined;

	await membership.updateProfile(user, profile);
	membership.refreshMembers(congregation);
};

export const removeUserFromCongregation = async (
	user: User,
	congregation?: Congregation,
	operations: Partial<UserCongregationMembershipOperations> = {},
): Promise<void> => {
	const membership = resolveMembershipOperations(operations);
	const profile = structuredClone(user.profile);
	profile.congregation = undefined;
	await membership.updateProfile(user, profile);

	const settings = structuredClone(user.settings);
	settings.backup_automatic = '';
	settings.data_view = '';
	settings.hour_credits_enabled = '';
	settings.theme_follow_os_enabled = '';
	await membership.updateSettings(user, settings);

	await membership.updateSessions(user, []);
	await membership.saveFieldServiceReports(user, []);
	await membership.saveBibleStudies(user, []);
	await membership.saveDelegatedFieldServiceReports(user, []);

	if (congregation) membership.refreshMembers(congregation);
};
