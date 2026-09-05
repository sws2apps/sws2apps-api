import type { StandardRecord } from '../../types/standard-record.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import { deleteUser } from '#modules/users/index.js';
import {
	projectUserSessions,
	revokeSessionForUser,
	UserAccountError,
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

export type PocketUserErrorCode =
	| 'USER_NOT_FOUND'
	| 'SESSION_NOT_FOUND'
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED';

export class PocketUserError extends Error {
	constructor(public readonly code: PocketUserErrorCode) {
		super(code);
		this.name = 'PocketUserError';
	}
}

export type PocketUserOperations = {
	revokeSession: typeof revokeSessionForUser;
	deleteAccount: typeof deleteUser;
	refreshMembers: typeof refreshCongregationMembers;
};

const defaultPocketUserOperations: PocketUserOperations = {
	revokeSession: revokeSessionForUser,
	deleteAccount: deleteUser,
	refreshMembers: refreshCongregationMembers,
};

const getPocketUser = (userId: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new PocketUserError('USER_NOT_FOUND');
	return user;
};

export const getPocketUserSessions = (userId: string, visitorId: string) => {
	const user = getPocketUser(userId);
	return projectUserSessions(user.sessions, visitorId);
};

export const revokePocketUserSession = async (
	userId: string,
	identifier: string,
	operations: Partial<PocketUserOperations> = {},
) => {
	const pocketOperations = { ...defaultPocketUserOperations, ...operations };
	const user = getPocketUser(userId);
	let sessions;

	try {
		sessions = await pocketOperations.revokeSession(user, identifier);
	} catch (error) {
		if (error instanceof UserAccountError && error.code === 'SESSION_NOT_FOUND') {
			throw new PocketUserError('SESSION_NOT_FOUND');
		}

		throw error;
	}

	const congregationId = user.profile.congregation?.id;

	if (congregationId) {
		const congregation = CongregationsList.findById(congregationId);
		if (congregation) pocketOperations.refreshMembers(congregation);
	}

	return sessions;
};

const getAuthorizedPocketUser = (userId: string) => {
	const user = getPocketUser(userId);
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
	getAuthorizedPocketUser(userId);
	return getUserAuxiliaryApplications(userId);
};

export const submitPocketApplication = async (userId: string, form: StandardRecord) => {
	getAuthorizedPocketUser(userId);
	await submitUserAuxiliaryApplication(userId, form);
};

export const deletePocketAccount = async (
	userId: string,
	operations: Partial<PocketUserOperations> = {},
) => {
	const pocketOperations = { ...defaultPocketUserOperations, ...operations };
	const user = getPocketUser(userId);
	const congregationId = user.profile.congregation?.id;

	await pocketOperations.deleteAccount(user.id);

	if (congregationId) {
		const congregation = CongregationsList.findById(congregationId);
		if (congregation) pocketOperations.refreshMembers(congregation);
	}
};
