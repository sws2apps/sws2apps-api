import type { AppRoleType } from '#domain/users/app-role.js';
import {
	UsersList,
	assignUserToCongregation,
	type User,
} from '#modules/users/index.js';
import type { Congregation } from '../congregation.js';
import { UserRequestAccess } from '../types/congregations.types.js';
import { setCongregationJoinRequests } from '../repositories/congregation-join-requests.repository.js';

type JoinRequestUser = {
	profile: {
		firstname: { value: string };
		lastname: { value: string };
	};
};

type FindJoinRequestUser = (userId: string) => JoinRequestUser | undefined;

export type CongregationJoinRequestOperations = {
	findUserById: (userId: string) => User | undefined;
	saveRequests: typeof setCongregationJoinRequests;
	assignUser: typeof assignUserToCongregation;
	getCurrentTimestamp: () => string;
};

const defaultJoinRequestOperations: CongregationJoinRequestOperations = {
	findUserById: (userId) => UsersList.findById(userId),
	saveRequests: (congregationId, requests) => {
		return setCongregationJoinRequests(congregationId, requests);
	},
	assignUser: (user, congregation, input) => {
		return assignUserToCongregation(user, congregation, input);
	},
	getCurrentTimestamp: () => new Date().toISOString(),
};

const resolveJoinRequestOperations = (
	overrides: Partial<CongregationJoinRequestOperations>,
): CongregationJoinRequestOperations => ({
	...defaultJoinRequestOperations,
	...overrides,
});

const deletedUserName = '_Deleted';

export const buildCongregationJoinRequests = (
	requests: readonly UserRequestAccess[],
	findUser: FindJoinRequestUser,
) => {
	return requests.map((request) => {
		const user = findUser(request.user);

		return {
			...request,
			firstname: user?.profile.firstname.value || deletedUserName,
			lastname: user?.profile.lastname.value || deletedUserName,
		};
	});
};

export const getCongregationJoinRequests = (congregation: Congregation) => {
	return buildCongregationJoinRequests(congregation.join_requests, (userId) =>
		UsersList.findById(userId),
	);
};

const removeDeletedUserRequests = (
	requests: UserRequestAccess[],
	findUserById: CongregationJoinRequestOperations['findUserById'],
) => {
	return requests
		.filter((request) => findUserById(request.user))
		.map((request) => structuredClone(request));
};

const saveJoinRequests = async (
	congregation: Congregation,
	requests: UserRequestAccess[],
	operations: CongregationJoinRequestOperations,
): Promise<void> => {
	await operations.saveRequests(congregation.id, requests);
	congregation.join_requests = requests;
};

export const requestCongregationMembership = async (
	congregation: Congregation,
	userId: string,
	operations: Partial<CongregationJoinRequestOperations> = {},
): Promise<void> => {
	const joinRequest = resolveJoinRequestOperations(operations);
	const requests = removeDeletedUserRequests(
		congregation.join_requests,
		joinRequest.findUserById,
	);
	const currentRequest = requests.find((request) => request.user === userId);
	const requestedAt = joinRequest.getCurrentTimestamp();

	if (currentRequest) {
		currentRequest.request_date = requestedAt;
	} else {
		requests.push({ user: userId, request_date: requestedAt });
	}

	await saveJoinRequests(congregation, requests, joinRequest);
};

export const declineCongregationMembership = async (
	congregation: Congregation,
	userId: string,
	operations: Partial<CongregationJoinRequestOperations> = {},
): Promise<void> => {
	const joinRequest = resolveJoinRequestOperations(operations);
	const requests = removeDeletedUserRequests(
		congregation.join_requests,
		joinRequest.findUserById,
	)
		.filter((request) => request.user !== userId);

	await saveJoinRequests(congregation, requests, joinRequest);
};

type ApproveCongregationMembershipInput = {
	role: AppRoleType[];
	person_uid: string;
	firstname?: string;
	lastname?: string;
};

export const approveCongregationMembership = async (
	congregation: Congregation,
	userId: string,
	input: ApproveCongregationMembershipInput,
	operations: Partial<CongregationJoinRequestOperations> = {},
): Promise<void> => {
	const joinRequest = resolveJoinRequestOperations(operations);
	const user = joinRequest.findUserById(userId)!;
	await joinRequest.assignUser(user, congregation, input);

	const requests = removeDeletedUserRequests(
		congregation.join_requests,
		joinRequest.findUserById,
	)
		.filter((request) => request.user !== userId);

	await saveJoinRequests(congregation, requests, joinRequest);
};
