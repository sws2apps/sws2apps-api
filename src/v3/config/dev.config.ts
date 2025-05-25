import { getAuth } from 'firebase-admin/auth';
import { LogLevel } from '@logtail/types';
import { logger } from '../services/logger/logger.js';
import { UserProfile } from '../definition/user.js';
import { setUserProfile } from '../services/firebase/users.js';

export const createAdminUser = async () => {
	try {
		if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return;

		// STEP 1: Check and create the admin user
		const adminEmail = 'admin@dummyemail.com';
		const adminUid = 'hGZjWcLTLjzImZCBFsHjHtAuDgrM';
		const adminName = 'local admin';

		let isCreate = false;

		try {
			await getAuth().getUser(adminUid);
		} catch {
			logger(LogLevel.Info, `creating admin user for firebase emulators`);

			await getAuth().importUsers([
				{
					uid: adminUid,
					email: adminEmail,
					displayName: adminName,
					providerData: [
						{
							providerId: 'google.com',
							uid: adminUid,
							email: adminEmail,
							displayName: adminName,
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
				firstname: { value: 'admin', updatedAt: new Date().toISOString() },
				lastname: { value: 'sws2apps', updatedAt: new Date().toISOString() },
				role: 'admin',
				auth_uid: adminUid,
				createdAt: new Date().toISOString(),
			};

			await setUserProfile(id, profile);

			logger(LogLevel.Info, `dev admin account creation created`);
		}
	} catch (error) {
		console.error(error);
	}
};
