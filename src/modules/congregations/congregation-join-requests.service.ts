import type { AppRoleType } from '../../domain/users/app-role.js';
import type { Congregation } from './congregation.js';
import { UsersList } from '../users/users.js';
import { UserRequestAccess } from './congregations.types.js';
import { setCongregationJoinRequests } from './congregation-join-requests.repository.js';
import { assignUserToCongregation } from '../users/user-congregation-membership.service.js';

type JoinRequestUser = {
	profile: {
		firstname: { value: string };
		lastname: { value: string };
	};
};

type FindJoinRequestUser = (userId: string) => JoinRequestUser | undefined;

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

const removeDeletedUserRequests = (requests: UserRequestAccess[]) => {
	return requests.filter((request) => UsersList.findById(request.user));
};

const saveJoinRequests = async (
	congregation: Congregation,
	requests: UserRequestAccess[],
): Promise<void> => {
	await setCongregationJoinRequests(congregation.id, requests);
	congregation.join_requests = requests;
};

export const requestCongregationMembership = async (
	congregation: Congregation,
	userId: string,
): Promise<void> => {
	const requests = removeDeletedUserRequests(congregation.join_requests);
	const currentRequest = requests.find((request) => request.user === userId);

	if (currentRequest) {
		currentRequest.request_date = new Date().toISOString();
	} else {
		requests.push({ user: userId, request_date: new Date().toISOString() });
	}

	await saveJoinRequests(congregation, requests);
};

export const declineCongregationMembership = async (
	congregation: Congregation,
	userId: string,
): Promise<void> => {
	const requests = removeDeletedUserRequests(congregation.join_requests)
		.filter((request) => request.user !== userId);

	await saveJoinRequests(congregation, requests);
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
): Promise<void> => {
	const user = UsersList.findById(userId)!;
	await assignUserToCongregation(user, congregation, input);

	const requests = removeDeletedUserRequests(congregation.join_requests)
		.filter((request) => request.user !== userId);

	await saveJoinRequests(congregation, requests);
};
