import type { AppRoleType } from '#domain/users/app-role.js';
import {
	CongregationsList,
	approveCongregationMembership,
	declineCongregationMembership,
	getCongregationJoinRequests,
	isCongregationMember,
	type Congregation,
} from '#modules/congregations/index.js';
import { UsersList, type User } from '#modules/users/index.js';

export type CongregationJoinRequestErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'USER_NOT_FOUND'
	| 'USER_ALREADY_ASSIGNED';

export class CongregationJoinRequestError extends Error {
	constructor(public readonly code: CongregationJoinRequestErrorCode) {
		super(code);
		this.name = 'CongregationJoinRequestError';
	}
}

export type CongregationJoinRequestAdministrationOperations = {
	findCongregationById: (congregationId: string) => Congregation | undefined;
	findUserById: (userId: string) => User | undefined;
	isMember: typeof isCongregationMember;
	approveMembership: typeof approveCongregationMembership;
	declineMembership: typeof declineCongregationMembership;
	getRequests: typeof getCongregationJoinRequests;
};

const defaultAdministrationOperations: CongregationJoinRequestAdministrationOperations = {
	findCongregationById: (congregationId) => CongregationsList.findById(congregationId),
	findUserById: (userId) => UsersList.findById(userId),
	isMember: (congregation, userId) => isCongregationMember(congregation, userId),
	approveMembership: (congregation, userId, input) => {
		return approveCongregationMembership(congregation, userId, input);
	},
	declineMembership: (congregation, userId) => {
		return declineCongregationMembership(congregation, userId);
	},
	getRequests: (congregation) => getCongregationJoinRequests(congregation),
};

const resolveAdministrationOperations = (
	overrides: Partial<CongregationJoinRequestAdministrationOperations>,
): CongregationJoinRequestAdministrationOperations => ({
	...defaultAdministrationOperations,
	...overrides,
});

const getAuthorizedCongregation = (
	congregationId: string,
	administratorId: string,
	operations: CongregationJoinRequestAdministrationOperations,
) => {
	const congregation = operations.findCongregationById(congregationId);
	if (!congregation) throw new CongregationJoinRequestError('CONGREGATION_NOT_FOUND');
	if (!operations.isMember(congregation, administratorId)) {
		throw new CongregationJoinRequestError('MEMBERSHIP_REQUIRED');
	}
	return congregation;
};

export const declineCongregationJoinRequest = async (
	congregationId: string,
	administratorId: string,
	userId: string,
	operations: Partial<CongregationJoinRequestAdministrationOperations> = {},
) => {
	const administration = resolveAdministrationOperations(operations);
	const congregation = getAuthorizedCongregation(
		congregationId,
		administratorId,
		administration,
	);
	await administration.declineMembership(congregation, userId);
	return administration.getRequests(congregation);
};

type ApproveJoinRequestInput = {
	roles: AppRoleType[];
	personUid: string;
	firstname: string;
	lastname: string;
};

export const approveCongregationJoinRequest = async (
	congregationId: string,
	administratorId: string,
	userId: string,
	input: ApproveJoinRequestInput,
	operations: Partial<CongregationJoinRequestAdministrationOperations> = {},
) => {
	const administration = resolveAdministrationOperations(operations);
	const congregation = getAuthorizedCongregation(
		congregationId,
		administratorId,
		administration,
	);
	const hasPendingRequest = congregation.join_requests.some(
		(request) => request.user === userId,
	);
	if (!hasPendingRequest) {
		throw new CongregationJoinRequestError('USER_NOT_FOUND');
	}

	const user = administration.findUserById(userId);
	if (!user) throw new CongregationJoinRequestError('USER_NOT_FOUND');
	if (user.profile.congregation) {
		throw new CongregationJoinRequestError('USER_ALREADY_ASSIGNED');
	}

	await administration.approveMembership(congregation, userId, {
		person_uid: input.personUid,
		role: input.roles,
		firstname: input.firstname,
		lastname: input.lastname,
	});

	return {
		requests: administration.getRequests(congregation),
		notification: {
			recipient: user.email,
			requestorName: user.profile.firstname.value,
			congregationName: congregation.settings.cong_name,
			countryCode: congregation.settings.country_code,
		},
	};
};
