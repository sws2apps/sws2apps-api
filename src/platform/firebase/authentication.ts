import { LogLevel } from '@logtail/types';
import { getAuth } from 'firebase-admin/auth';

import { logger } from '../logging/logger.js';

export const getFirebaseUserDetails = async (authenticationUserId: string) => {
	try {
		const userRecord = await getAuth().getUser(authenticationUserId);
		const authenticationProvider = userRecord.providerData[0]?.providerId || 'email';

		return {
			email: userRecord.email,
			auth_provider: authenticationProvider,
			createdAt: userRecord.metadata.creationTime,
		};
	} catch {
		logger(LogLevel.Warn, 'Firebase user details lookup failed');

		return undefined;
	}
};

export const updateFirebaseUserEmail = async (
	authenticationUserId: string,
	email: string,
): Promise<void> => {
	await getAuth().updateUser(authenticationUserId, { email });
};

export const verifyFirebaseIdToken = async (
	idToken: string,
): Promise<string | undefined> => {
	try {
		const decodedToken = await getAuth().verifyIdToken(idToken);

		return decodedToken.uid;
	} catch {
		logger(LogLevel.Warn, 'Firebase ID token verification failed');

		return undefined;
	}
};

export const deleteFirebaseAuthUser = async (
	authenticationUserId: string,
): Promise<void> => {
	try {
		await getAuth().deleteUser(authenticationUserId);
	} catch {
		logger(LogLevel.Warn, 'Firebase authentication user deletion failed');
	}
};
