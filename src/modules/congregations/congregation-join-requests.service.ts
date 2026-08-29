import { Congregation } from './congregation.js';
import { UsersList } from '../users/users.js';
import { UserRequestAccess } from './congregations.types.js';

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
