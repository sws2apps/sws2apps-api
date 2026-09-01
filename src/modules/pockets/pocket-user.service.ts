import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '../congregations/index.js';
import { UsersList } from '../users/index.js';
import { deleteUser } from '../users/index.js';
import {
	projectUserSessions,
	revokeSessionForUser,
} from '../users/index.js';
import {
	getUserAuxiliaryApplications,
	submitUserAuxiliaryApplication,
	submitUserFieldServiceReport,
} from '../users/index.js';
import {
	isCongregationMember,
	refreshCongregationMembers,
} from '../congregations/index.js';

export type PocketUserErrorCode = 'CONGREGATION_NOT_FOUND' | 'MEMBERSHIP_REQUIRED';

export class PocketUserError extends Error {
	constructor(public readonly code: PocketUserErrorCode) {
		super(code);
		this.name = 'PocketUserError';
	}
}

export const getPocketUserSessions = (userId: string, visitorId: string) => {
	const user = UsersList.findById(userId)!;
	return projectUserSessions(user.sessions, visitorId);
};

export const revokePocketUserSession = async (userId: string, identifier: string) => {
	const user = UsersList.findById(userId)!;
	const sessions = await revokeSessionForUser(user, identifier);
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
