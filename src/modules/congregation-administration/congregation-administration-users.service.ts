import type { AppRoleType } from '../../domain/users/app-role.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import { revokeSessionForUser } from '../users/users-account.service.js';
import { deleteUser } from '../users/user-lifecycle.service.js';
import {
	assignUserToCongregation,
	removeUserFromCongregation,
	removeUserPocketInvitation,
	updateUserCongregationMembership,
} from '../users/user-congregation-membership.service.js';
import {
	getCongregationMembers as buildCongregationMemberList,
	isCongregationMember,
	refreshCongregationMembers,
} from '../congregations/congregation-members.service.js';

export type CongregationAdministrationUserErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'USER_NOT_FOUND';

export class CongregationAdministrationUserError extends Error {
	constructor(public readonly code: CongregationAdministrationUserErrorCode) {
		super(code);
		this.name = 'CongregationAdministrationUserError';
	}
}

const getAuthorizedCongregation = (
	congregationId: string,
	administratorId: string,
) => {
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) {
		throw new CongregationAdministrationUserError('CONGREGATION_NOT_FOUND');
	}

	if (!isCongregationMember(congregation, administratorId)) {
		throw new CongregationAdministrationUserError('MEMBERSHIP_REQUIRED');
	}

	return congregation;
};

const getUser = (userId: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new CongregationAdministrationUserError('USER_NOT_FOUND');
	return user;
};

export const getCongregationMembers = (
	congregationId: string,
	administratorId: string,
	currentVisitorId: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	return buildCongregationMemberList(congregation, currentVisitorId);
};

type CreatePocketUserInput = {
	firstname: string;
	lastname: string;
	roles: AppRoleType[];
	personUid: string;
	secretCode: string;
};

export const createCongregationPocketUser = async (
	congregationId: string,
	administratorId: string,
	currentVisitorId: string,
	input: CreatePocketUserInput,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);

	await UsersList.createPocket({
		cong_id: congregationId,
		cong_person_uid: input.personUid,
		cong_role: input.roles,
		user_firstname: input.firstname,
		user_lastname: input.lastname,
		user_secret_code: input.secretCode,
	});

	refreshCongregationMembers(congregation);
	return buildCongregationMemberList(congregation, currentVisitorId);
};

type UpdateCongregationUserInput = {
	secretCode: string;
	roles: AppRoleType[];
	personUid: string;
	personDelegates: string[];
	firstname: string;
	lastname: string;
};

export const updateCongregationUser = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
	input: UpdateCongregationUserInput,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const user = getUser(targetUserId);

	await updateUserCongregationMembership(user, congregation, {
		roles: input.roles,
		personUid: input.personUid,
		personDelegates: input.personDelegates,
		pocketInvitationCode: input.secretCode,
	});

	if (
		input.firstname !== user.profile.firstname.value ||
		input.lastname !== user.profile.lastname.value
	) {
		const profile = structuredClone(user.profile);
		const updatedAt = new Date().toISOString();
		profile.firstname = { value: input.firstname, updatedAt };
		profile.lastname = { value: input.lastname, updatedAt };
		await user.updateProfile(profile);
	}

	return buildCongregationMemberList(congregation, currentVisitorId);
};

export const revokeCongregationUserSession = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
	sessionIdentifier: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await revokeSessionForUser(getUser(targetUserId), sessionIdentifier);
	return buildCongregationMemberList(congregation, currentVisitorId);
};

export const deleteCongregationUserPocketCode = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await removeUserPocketInvitation(getUser(targetUserId), congregation);
	return buildCongregationMemberList(congregation, currentVisitorId);
};

export const findEligibleCongregationUser = (
	congregationId: string,
	administratorId: string,
	email: string,
) => {
	getAuthorizedCongregation(congregationId, administratorId);
	const user = UsersList.findByEmail(email);

	if (!user || user.profile.congregation?.id) {
		throw new CongregationAdministrationUserError('USER_NOT_FOUND');
	}

	return user;
};

type AddCongregationUserInput = {
	userId: string;
	firstname: string;
	lastname: string;
	roles: AppRoleType[];
	personUid: string;
};

export const addCongregationUser = async (
	congregationId: string,
	administratorId: string,
	currentVisitorId: string,
	input: AddCongregationUserInput,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const user = getUser(input.userId);

	await assignUserToCongregation(user, congregation, {
		role: input.roles,
		firstname: input.firstname,
		lastname: input.lastname,
		person_uid: input.personUid,
	});

	return buildCongregationMemberList(congregation, currentVisitorId);
};

export const removeCongregationUser = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const user = getUser(targetUserId);

	if (user.profile.role === 'vip') await removeUserFromCongregation(user, congregation);
	if (user.profile.role === 'pocket') await deleteUser(user.id);

	return buildCongregationMemberList(congregation, currentVisitorId);
};

export const setCongregationAdministratorPersonUid = async (
	congregationId: string,
	administratorId: string,
	personUid: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const administrator = getUser(administratorId);
	const profile = structuredClone(administrator.profile);
	profile.congregation!.user_local_uid = personUid;

	await administrator.updateProfile(profile);
	refreshCongregationMembers(congregation);
};
