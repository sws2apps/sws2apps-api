import {
	getFirebaseUserDetails,
	updateFirebaseUserEmail,
} from '#platform/firebase/authentication.js';
import type { User } from '../user.js';

export type UserIdentityOperations = {
	getAuthenticationDetails: typeof getFirebaseUserDetails;
	updateAuthenticationEmail: typeof updateFirebaseUserEmail;
};

const defaultUserIdentityOperations: UserIdentityOperations = {
	getAuthenticationDetails: (authenticationUserId) => {
		return getFirebaseUserDetails(authenticationUserId);
	},
	updateAuthenticationEmail: (authenticationUserId, email) => {
		return updateFirebaseUserEmail(authenticationUserId, email);
	},
};

export const loadUserIdentity = async (
	user: User,
	operations: Partial<UserIdentityOperations> = {},
): Promise<void> => {
	if (user.profile.role === 'pocket') return;

	const identity = {
		...defaultUserIdentityOperations,
		...operations,
	};
	const authenticationDetails = await identity.getAuthenticationDetails(
		user.profile.auth_uid!,
	);
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
	operations: Partial<UserIdentityOperations> = {},
): Promise<void> => {
	if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
		throw new RangeError('Batch size must be a positive integer');
	}

	for (let startIndex = 0; startIndex < users.length; startIndex += batchSize) {
		const batch = users.slice(startIndex, startIndex + batchSize);
		await Promise.all(batch.map((user) => loadUserIdentity(user, operations)));
	}
};

export const synchronizeAuthenticationEmail = async (
	authenticationUserId: string,
	email: string,
	operations: Partial<UserIdentityOperations> = {},
): Promise<void> => {
	const identity = {
		...defaultUserIdentityOperations,
		...operations,
	};

	await identity.updateAuthenticationEmail(authenticationUserId, email);
};

export const updateUserAuthenticationEmail = async (
	user: User,
	email: string,
	operations: Partial<UserIdentityOperations> = {},
): Promise<void> => {
	await synchronizeAuthenticationEmail(user.profile.auth_uid!, email, operations);
	user.email = email;
};
