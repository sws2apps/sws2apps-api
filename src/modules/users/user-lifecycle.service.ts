import { LogLevel } from '@logtail/types';
import { deleteFirebaseAuthUser } from '../../platform/firebase/authentication.js';
import { deleteFileFromStorage } from '../../platform/firebase/storage.js';
import { logger } from '../../platform/logging/logger.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from './users.js';

export const deleteUser = async (userId: string): Promise<void> => {
	const user = UsersList.findById(userId);
	const congregationId = user?.profile.congregation?.id;

	await deleteFileFromStorage({ type: 'user', path: userId });

	if (user?.profile.auth_uid) {
		await deleteFirebaseAuthUser(user.profile.auth_uid);
	}

	UsersList.removeById(userId);

	if (congregationId) {
		CongregationsList.findById(congregationId)?.reloadMembers();
	}
};

export const removeOutdatedUserSessions = async (): Promise<void> => {
	logger(LogLevel.Info, 'cleaning outdated user sessions ...');

	try {
		const oldestValidSession = new Date();
		oldestValidSession.setMonth(oldestValidSession.getMonth() - 6);

		for (const user of UsersList.list) {
			const validSessions = user.sessions.filter((session) => {
				return !session.last_seen || new Date(session.last_seen) > oldestValidSession;
			});

			if (validSessions.length !== user.sessions.length) {
				await user.updateSessions(validSessions);
			}
		}

		logger(LogLevel.Info, 'outdated sessions cleanup completed.');
	} catch {
		logger(LogLevel.Warn, 'an error occured while removing outdated session');
	}
};
