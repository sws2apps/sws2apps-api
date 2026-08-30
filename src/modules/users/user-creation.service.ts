import {
	loadUserIdentity,
	synchronizeAuthenticationEmail,
} from './user-identity.service.js';
import type { PocketNewParams, UserNewParams } from './user.types.js';
import { User } from './user.js';
import { UsersList } from './users.js';
import {
	createPocketUser as persistPocketUser,
	createUser as persistUser,
} from './users.repository.js';

const hydrateCreatedUser = async (userId: string): Promise<User> => {
	const user = new User(userId);
	await user.loadDetails();
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

	const userId = await persistUser(params);
	return hydrateCreatedUser(userId);
};

export const createPocketApplicationUser = async (
	params: PocketNewParams,
): Promise<User> => {
	const userId = await persistPocketUser(params);
	return hydrateCreatedUser(userId);
};
