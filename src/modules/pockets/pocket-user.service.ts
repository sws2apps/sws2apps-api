import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import { deleteUser } from '../users/user-lifecycle.service.js';

export type PocketUserErrorCode = 'CONGREGATION_NOT_FOUND' | 'MEMBERSHIP_REQUIRED';

export class PocketUserError extends Error {
	constructor(public readonly code: PocketUserErrorCode) {
		super(code);
		this.name = 'PocketUserError';
	}
}

export const getPocketUserSessions = (userId: string, visitorId: string) => {
	const user = UsersList.findById(userId)!;
	return user.getActiveSessions(visitorId);
};

export const revokePocketUserSession = async (userId: string, identifier: string) => {
	const user = UsersList.findById(userId)!;
	const sessions = await user.revokeSession(identifier);
	const congregationId = user.profile.congregation?.id;

	if (congregationId) {
		void CongregationsList.findById(congregationId)?.reloadMembers();
	}

	return sessions;
};

const getAuthorizedPocketUser = (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;
	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;

	if (!congregation) throw new PocketUserError('CONGREGATION_NOT_FOUND');
	if (!congregation.hasMember(user.id)) throw new PocketUserError('MEMBERSHIP_REQUIRED');

	return { user, congregation };
};

export const submitPocketReport = (userId: string, report: StandardRecord) => {
	const { user } = getAuthorizedPocketUser(userId);
	void user.postReport(report);
};

export const getPocketApplications = (userId: string) => {
	const user = UsersList.findById(userId)!;
	return user.getApplications();
};

export const submitPocketApplication = (userId: string, form: StandardRecord) => {
	const user = UsersList.findById(userId)!;
	const congregation = CongregationsList.findById(user.profile.congregation!.id)!;
	const application = {
		request_id: crypto.randomUUID().toUpperCase(),
		person_uid: user.profile.congregation!.user_local_uid,
		months: form.months,
		continuous: form.continuous,
		submitted: form.submitted,
		updatedAt: new Date().toISOString(),
		expired: null,
	};

	void congregation.saveApplication(application);
};

export const deletePocketAccount = async (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	await deleteUser(user.id);

	if (congregationId) {
		void CongregationsList.findById(congregationId)?.reloadMembers();
	}
};
