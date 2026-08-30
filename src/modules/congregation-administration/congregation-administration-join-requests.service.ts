import type { AppRoleType } from '../../domain/users/app-role.js';
import { getCongregationJoinRequests } from '../congregations/congregation-join-requests.service.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';

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

const getAuthorizedCongregation = (congregationId: string, administratorId: string) => {
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new CongregationJoinRequestError('CONGREGATION_NOT_FOUND');
	if (!congregation.hasMember(administratorId)) {
		throw new CongregationJoinRequestError('MEMBERSHIP_REQUIRED');
	}
	return congregation;
};

export const declineCongregationJoinRequest = async (
	congregationId: string,
	administratorId: string,
	userId: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await congregation.declineJoinRequest(userId);
	return getCongregationJoinRequests(congregation);
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
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const user = UsersList.findById(userId);
	if (!user) throw new CongregationJoinRequestError('USER_NOT_FOUND');
	if (user.profile.congregation) {
		throw new CongregationJoinRequestError('USER_ALREADY_ASSIGNED');
	}

	await congregation.acceptJoinRequest(userId, {
		person_uid: input.personUid,
		role: input.roles,
		firstname: input.firstname,
		lastname: input.lastname,
	});

	return {
		requests: getCongregationJoinRequests(congregation),
		notification: {
			recipient: user.email,
			requestorName: user.profile.firstname.value,
			congregationName: congregation.settings.cong_name,
			countryCode: congregation.settings.country_code,
		},
	};
};
