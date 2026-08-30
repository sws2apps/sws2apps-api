import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from './users.js';

export type UserCongregationActivityErrorCode =
	| 'CONGREGATION_NOT_ASSIGNED'
	| 'CONGREGATION_NOT_FOUND';

export class UserCongregationActivityError extends Error {
	constructor(public readonly code: UserCongregationActivityErrorCode) {
		super(code);
		this.name = 'UserCongregationActivityError';
	}
}

const getUserCongregation = (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	if (!congregationId) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_ASSIGNED');
	}

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_FOUND');
	}

	return { user, congregation };
};

export const getUserAuxiliaryApplications = (userId: string) => {
	const { user } = getUserCongregation(userId);
	return user.getApplications();
};

export const submitUserAuxiliaryApplication = (
	userId: string,
	applicationForm: StandardRecord,
) => {
	const { user, congregation } = getUserCongregation(userId);
	const application = {
		request_id: crypto.randomUUID().toUpperCase(),
		person_uid: user.profile.congregation!.user_local_uid,
		months: applicationForm.months,
		continuous: applicationForm.continuous,
		submitted: applicationForm.submitted,
		updatedAt: new Date().toISOString(),
		expired: null,
	};

	void congregation.saveApplication(application);
};

export const submitUserFieldServiceReport = (
	userId: string,
	report: StandardRecord,
) => {
	const { user } = getUserCongregation(userId);
	void user.postReport(report);
};
