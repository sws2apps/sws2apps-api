import { LogLevel } from '@logtail/types';

import {
	CongregationsList,
	refreshCongregationMembers,
	type Congregation,
} from '#modules/congregations/index.js';
import { deleteFirebaseAuthUser } from '#platform/firebase/authentication.js';
import { logger } from '#platform/logging/logger.js';
import { deletePersistedUser } from '../repositories/user-lifecycle.repository.js';
import type { User } from '../user.js';
import { UsersList } from '../users.js';
import { updateUserSessions } from './user-data.service.js';

type DeleteUserOperations = {
	findUserById: (userId: string) => User | undefined;
	findCongregationById: (congregationId: string) => Congregation | undefined;
	deletePersistedUser: typeof deletePersistedUser;
	deleteAuthenticationUser: typeof deleteFirebaseAuthUser;
	removeUserById: (userId: string) => void;
	refreshMembers: typeof refreshCongregationMembers;
	log: typeof logger;
};

const defaultDeleteUserOperations: DeleteUserOperations = {
	findUserById: (userId) => UsersList.findById(userId),
	findCongregationById: (congregationId) => CongregationsList.findById(congregationId),
	deletePersistedUser: (userId) => deletePersistedUser(userId),
	deleteAuthenticationUser: (authenticationUserId) => {
		return deleteFirebaseAuthUser(authenticationUserId);
	},
	removeUserById: (userId) => UsersList.removeById(userId),
	refreshMembers: (congregation) => refreshCongregationMembers(congregation),
	log: logger,
};

/**
 * Removes the persisted application data before evicting the user from the
 * cache. Persisted data removal is the only destructive operation whose
 * failure aborts the deletion; once it succeeds the cache entry and the
 * congregation membership are always updated so the in-memory state never
 * outlives the backing data. External identity removal is best-effort: its
 * failures are logged instead of leaving a cached account without persisted
 * data.
 */
export const deleteUser = async (
	userId: string,
	operations: Partial<DeleteUserOperations> = {},
): Promise<void> => {
	const lifecycle = {
		...defaultDeleteUserOperations,
		...operations,
	};
	const user = lifecycle.findUserById(userId);
	const congregationId = user?.profile.congregation?.id;

	await lifecycle.deletePersistedUser(userId);

	if (user?.profile.auth_uid) {
		try {
			await lifecycle.deleteAuthenticationUser(user.profile.auth_uid);
		} catch {
			lifecycle.log(
				LogLevel.Warn,
				'the user data was removed but the external identity deletion failed',
			);
		}
	}

	lifecycle.removeUserById(userId);

	if (congregationId) {
		const congregation = lifecycle.findCongregationById(congregationId);
		if (congregation) lifecycle.refreshMembers(congregation);
	}
};

type SessionCleanupOperations = {
	getUsers: () => readonly User[];
	updateSessions: typeof updateUserSessions;
	getCurrentTime: () => Date;
	log: typeof logger;
};

const defaultSessionCleanupOperations: SessionCleanupOperations = {
	getUsers: () => UsersList.list,
	updateSessions: (user, sessions) => updateUserSessions(user, sessions),
	getCurrentTime: () => new Date(),
	log: logger,
};

export const removeOutdatedUserSessions = async (
	operations: Partial<SessionCleanupOperations> = {},
): Promise<void> => {
	const cleanup = {
		...defaultSessionCleanupOperations,
		...operations,
	};
	cleanup.log(LogLevel.Info, 'cleaning outdated user sessions ...');

	try {
		const oldestValidSession = cleanup.getCurrentTime();
		oldestValidSession.setMonth(oldestValidSession.getMonth() - 6);

		for (const user of cleanup.getUsers()) {
			const validSessions = user.sessions.filter((session) => {
				return !session.last_seen || new Date(session.last_seen) > oldestValidSession;
			});

			if (validSessions.length !== user.sessions.length) {
				await cleanup.updateSessions(user, validSessions);
			}
		}

		cleanup.log(LogLevel.Info, 'outdated sessions cleanup completed.');
	} catch {
		cleanup.log(LogLevel.Warn, 'an error occurred while removing outdated sessions');
	}
};
