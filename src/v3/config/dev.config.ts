import { getAuth } from 'firebase-admin/auth';
import { LogLevel } from '@logtail/types';
import { logger } from '../services/logger/logger.js';
import { UserGlobalRoleType, UserProfile } from '../definition/user.js';
import { setUserProfile } from '../services/firebase/users.js';

export const createDevTestUsers = async () => {
	try {
		if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return;

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
			// STEP 1: Check and create the user
			let isCreate = false;

			try {
				await getAuth().getUser(user.uid);
			} catch {
				logger(LogLevel.Info, `creating ${user.role} for firebase emulators`);

				await getAuth().importUsers([
					{
						uid: user.uid,
						email: user.email,
						displayName: `${user.firstname} ${user.lastname}`,
						providerData: [
							{
								providerId: 'google.com',
								uid: user.uid,
								email: user.email,
								displayName: `${user.firstname} ${user.lastname}`,
							},
						],
					},
				]);

				isCreate = true;
			}

			if (isCreate) {
				// STEP 2: Create user record for app

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
	} catch (error) {
		console.error(error);
	}
};
