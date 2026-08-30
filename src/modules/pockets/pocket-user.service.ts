import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import { deleteUser } from '../users/user-lifecycle.service.js';
import {
	getUserAuxiliaryApplications,
	submitUserAuxiliaryApplication,
	submitUserFieldServiceReport,
} from '../users/users-congregation-activity.service.js';
import {
	isCongregationMember,
	refreshCongregationMembers,
} from '../congregations/congregation-members.service.js';

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
		const congregation = CongregationsList.findById(congregationId);
		if (congregation) refreshCongregationMembers(congregation);
	}

	return sessions;
};

const getAuthorizedPocketUser = (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;
	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;

	if (!congregation) throw new PocketUserError('CONGREGATION_NOT_FOUND');
	if (!isCongregationMember(congregation, user.id)) throw new PocketUserError('MEMBERSHIP_REQUIRED');

	return { user, congregation };
};

export const submitPocketReport = (userId: string, report: StandardRecord) => {
	getAuthorizedPocketUser(userId);
	submitUserFieldServiceReport(userId, report);
};

export const getPocketApplications = (userId: string) => {
	return getUserAuxiliaryApplications(userId);
};

export const submitPocketApplication = (userId: string, form: StandardRecord) => {
	submitUserAuxiliaryApplication(userId, form);
};

export const deletePocketAccount = async (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	await deleteUser(user.id);

	if (congregationId) {
		const congregation = CongregationsList.findById(congregationId);
		if (congregation) refreshCongregationMembers(congregation);
	}
};
