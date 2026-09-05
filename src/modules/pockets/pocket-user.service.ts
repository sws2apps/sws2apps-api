import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import { deleteUser } from '#modules/users/index.js';
import {
	projectUserSessions,
	revokeSessionForUser,
} from '#modules/users/index.js';
import {
	getUserAuxiliaryApplications,
	submitUserAuxiliaryApplication,
	submitUserFieldServiceReport,
} from '#modules/users/index.js';
import {
	isCongregationMember,
	refreshCongregationMembers,
} from '#modules/congregations/index.js';

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

export const submitPocketReport = async (
	userId: string,
	report: StandardRecord,
	submitReport: typeof submitUserFieldServiceReport = submitUserFieldServiceReport,
): Promise<void> => {
	getAuthorizedPocketUser(userId);
	await submitReport(userId, report);
};

export const getPocketApplications = (userId: string) => {
	return getUserAuxiliaryApplications(userId);
};

export const submitPocketApplication = async (userId: string, form: StandardRecord) => {
	await submitUserAuxiliaryApplication(userId, form);
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
