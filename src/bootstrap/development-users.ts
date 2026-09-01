import { LogLevel } from '@logtail/types';
import { logger } from '#platform/logging/logger.js';
import { importFirebaseAuthenticationUserIfMissing } from '#platform/firebase/authentication.js';
import type {
	UserGlobalRoleType,
	UserProfile,
} from '#modules/users/index.js';
import { setUserProfile } from '#modules/users/index.js';
import { env } from '#config/env.js';

export const createDevelopmentUsers = async () => {
	try {
		if (!env.firebaseAuthEmulatorHost) return;

		const users = [
			{
				email: 'admin@dummyjson.com',
				uid: 'hGZjWcLTLjzImZCBFsHjHtAuDgrM',
				firstname: 'admin',
				lastname: 'local',
				role: 'admin' as UserGlobalRoleType,
			},
			{
				email: 'user@dummyjson.com',
				uid: 'CmoPmwOni3mQHJWECP98b5tS9zvi',
				firstname: 'user',
				lastname: 'local',
				role: 'vip' as UserGlobalRoleType,
			},
		];

		for (const user of users) {
			const displayName = `${user.firstname} ${user.lastname}`;
			const userWasCreated = await importFirebaseAuthenticationUserIfMissing({
				uid: user.uid,
				email: user.email,
				displayName,
			});

			if (userWasCreated) {
				logger(LogLevel.Info, `creating ${user.role} for firebase emulators`);

				const id = crypto.randomUUID().toUpperCase();

				const profile: UserProfile = {
					firstname: { value: user.firstname, updatedAt: new Date().toISOString() },
					lastname: { value: user.lastname, updatedAt: new Date().toISOString() },
					role: user.role,
					auth_uid: user.uid,
					createdAt: new Date().toISOString(),
				};

				await setUserProfile(id, profile);

				logger(LogLevel.Info, `dev ${user.role} role account creation created`);
			}
		}
	} catch {
		logger(LogLevel.Error, 'Firebase emulator user setup failed');
	}
};
