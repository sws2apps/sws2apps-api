import {
	getFirebaseUserDetails,
	updateFirebaseUserEmail,
} from '#platform/firebase/authentication.js';
import type { User } from '../user.js';

export const loadUserIdentity = async (user: User): Promise<void> => {
	if (user.profile.role === 'pocket') return;

	const authenticationDetails = await getFirebaseUserDetails(user.profile.auth_uid!);
	if (!authenticationDetails) return;

	user.email = authenticationDetails.email;
	user.auth_provider = authenticationDetails.auth_provider;

	if (!user.profile.createdAt) {
		user.profile.createdAt = authenticationDetails.createdAt;
	}
};

export const loadUserIdentities = async (
	users: User[],
	batchSize = 20,
): Promise<void> => {
	for (let startIndex = 0; startIndex < users.length; startIndex += batchSize) {
		const batch = users.slice(startIndex, startIndex + batchSize);
		await Promise.all(batch.map((user) => loadUserIdentity(user)));
	}
};

export const synchronizeAuthenticationEmail = async (
	authenticationUserId: string,
	email: string,
): Promise<void> => {
	await updateFirebaseUserEmail(authenticationUserId, email);
};

export const updateUserAuthenticationEmail = async (
	user: User,
	email: string,
): Promise<void> => {
	await synchronizeAuthenticationEmail(user.profile.auth_uid!, email);
	user.email = email;
};
