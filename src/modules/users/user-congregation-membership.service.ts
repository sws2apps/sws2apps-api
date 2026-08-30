import type { AppRoleType } from '../../domain/users/app-role.js';
import { encryptData } from '../../platform/encryption/encryption.js';
import type { Congregation } from '../congregations/congregation.js';
import type { User } from './user.js';
import { refreshCongregationMembers } from '../congregations/congregation-members.service.js';

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

	await user.updateProfile(profile);
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

	await user.updateProfile(profile);
	refreshCongregationMembers(congregation);
};

export const removeUserPocketInvitation = async (
	user: User,
	congregation: Congregation,
): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.congregation!.pocket_invitation_code = undefined;

	await user.updateProfile(profile);
	refreshCongregationMembers(congregation);
};

export const removeUserFromCongregation = async (
	user: User,
	congregation?: Congregation,
): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.congregation = undefined;
	await user.updateProfile(profile);

	const settings = structuredClone(user.settings);
	settings.backup_automatic = '';
	settings.data_view = '';
	settings.hour_credits_enabled = '';
	settings.theme_follow_os_enabled = '';
	await user.updateSettings(settings);

	await user.updateSessions([]);
	await user.saveFieldServiceReports([]);
	await user.saveBibleStudies([]);
	await user.saveDelegatedFieldServiceReports([]);

	if (congregation) refreshCongregationMembers(congregation);
};
