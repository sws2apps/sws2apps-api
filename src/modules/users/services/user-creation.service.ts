import {
	loadUserIdentity,
	synchronizeAuthenticationEmail,
} from './user-identity.service.js';
import type { PocketNewParams, UserNewParams } from '../types/user.types.js';
import { User } from '../user.js';
import { UsersList } from '../users.js';
import {
	createPersistedPocketUser,
	createPersistedUser,
} from '../repositories/user-lifecycle.repository.js';
import { hydrateUser } from './user-hydration.service.js';

const hydrateCreatedUser = async (userId: string): Promise<User> => {
	const user = new User(userId);
	await hydrateUser(user);
	await loadUserIdentity(user);
	UsersList.add(user);

	return user;
};

export const createApplicationUser = async (
	params: UserNewParams,
): Promise<User> => {
	if (params.email) {
		await synchronizeAuthenticationEmail(params.auth_uid, params.email);
	}

	const userId = await createPersistedUser(params);
	return hydrateCreatedUser(userId);
};

export const createPocketApplicationUser = async (
	params: PocketNewParams,
): Promise<User> => {
	const userId = await createPersistedPocketUser(params);
	return hydrateCreatedUser(userId);
};
