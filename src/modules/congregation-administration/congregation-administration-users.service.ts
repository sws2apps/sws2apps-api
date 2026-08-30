import type { AppRoleType } from '../../domain/users/app-role.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';

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

	if (!congregation.hasMember(administratorId)) {
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
	return congregation.getMembers(currentVisitorId);
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

	void congregation.reloadMembers();
	return congregation.getMembers(currentVisitorId);
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

	await user.updateCongregationDetails(
		input.roles,
		input.personUid,
		input.personDelegates,
		input.secretCode,
	);

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

	return congregation.getMembers(currentVisitorId);
};

export const revokeCongregationUserSession = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
	sessionIdentifier: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await getUser(targetUserId).revokeSession(sessionIdentifier);
	return congregation.getMembers(currentVisitorId);
};

export const deleteCongregationUserPocketCode = async (
	congregationId: string,
	administratorId: string,
	targetUserId: string,
	currentVisitorId: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await getUser(targetUserId).deletePocketCode();
	return congregation.getMembers(currentVisitorId);
};
