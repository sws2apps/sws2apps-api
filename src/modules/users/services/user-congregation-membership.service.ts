import type { AppRoleType } from '#domain/users/app-role.js';
import { encryptData } from '#platform/encryption/encryption.js';
import type { Congregation } from '#modules/congregations/index.js';
import type { User } from '../user.js';
import { refreshCongregationMembers } from '#modules/congregations/index.js';
import {
	saveUserBibleStudies,
	saveUserDelegatedFieldServiceReports,
	saveUserFieldServiceReports,
	updateUserProfile,
	updateUserSessions,
	updateUserSettings,
} from './user-data.service.js';

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
): Promise<void> => {
	const profile = structuredClone(user.profile);

	profile.congregation = {
		id: congregation.id,
		cong_role: input.role,
		account_type: 'vip',
	};

	if (input.firstname) {
		profile.firstname = { value: input.firstname, updatedAt: new Date().toISOString() };
	}

	if (input.lastname) {
		profile.lastname = { value: input.lastname, updatedAt: new Date().toISOString() };
	}

	if (input.person_uid) {
		profile.congregation.user_local_uid = input.person_uid;
	}

	await updateUserProfile(user, profile);
	refreshCongregationMembers(congregation);
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
): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.congregation!.cong_role = input.roles;

	if (input.personUid) {
		profile.congregation!.user_local_uid = input.personUid;
	}

	if (input.personDelegates) {
		profile.congregation!.user_members_delegate = input.personDelegates;
	}

	if (input.pocketInvitationCode) {
		profile.congregation!.pocket_invitation_code = encryptData(input.pocketInvitationCode);
	}

	await updateUserProfile(user, profile);
	refreshCongregationMembers(congregation);
};

export const removeUserPocketInvitation = async (
	user: User,
	congregation: Congregation,
): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.congregation!.pocket_invitation_code = undefined;

	await updateUserProfile(user, profile);
	refreshCongregationMembers(congregation);
};

export const removeUserFromCongregation = async (
	user: User,
	congregation?: Congregation,
): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.congregation = undefined;
	await updateUserProfile(user, profile);

	const settings = structuredClone(user.settings);
	settings.backup_automatic = '';
	settings.data_view = '';
	settings.hour_credits_enabled = '';
	settings.theme_follow_os_enabled = '';
	await updateUserSettings(user, settings);

	await updateUserSessions(user, []);
	await saveUserFieldServiceReports(user, []);
	await saveUserBibleStudies(user, []);
	await saveUserDelegatedFieldServiceReports(user, []);

	if (congregation) refreshCongregationMembers(congregation);
};
