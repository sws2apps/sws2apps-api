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

export type UserCreationOperations = {
	synchronizeEmail: typeof synchronizeAuthenticationEmail;
	createPersistedUser: typeof createPersistedUser;
	createPersistedPocketUser: typeof createPersistedPocketUser;
	hydrateUser: typeof hydrateUser;
	loadIdentity: typeof loadUserIdentity;
	addUser: (user: User) => void;
};

const defaultUserCreationOperations: UserCreationOperations = {
	synchronizeEmail: (authenticationUserId, email) => {
		return synchronizeAuthenticationEmail(authenticationUserId, email);
	},
	createPersistedUser: (params) => createPersistedUser(params),
	createPersistedPocketUser: (params) => createPersistedPocketUser(params),
	hydrateUser: (user) => hydrateUser(user),
	loadIdentity: (user) => loadUserIdentity(user),
	addUser: (user) => UsersList.add(user),
};

const hydrateCreatedUser = async (
	userId: string,
	operations: UserCreationOperations,
): Promise<User> => {
	const user = new User(userId);
	await operations.hydrateUser(user);
	await operations.loadIdentity(user);
	operations.addUser(user);

	return user;
};

/**
 * Synchronizes identity data, persists the account, and fully hydrates it
 * before publication to the application cache. Earlier failures cannot expose
 * a partially initialized user to concurrent requests.
 */
export const createApplicationUser = async (
	params: UserNewParams,
	operations: Partial<UserCreationOperations> = {},
): Promise<User> => {
	const creation = {
		...defaultUserCreationOperations,
		...operations,
	};

	if (params.email) {
		await creation.synchronizeEmail(params.auth_uid, params.email);
	}

	const userId = await creation.createPersistedUser(params);
	return hydrateCreatedUser(userId, creation);
};

export const createPocketApplicationUser = async (
	params: PocketNewParams,
	operations: Partial<UserCreationOperations> = {},
): Promise<User> => {
	const creation = {
		...defaultUserCreationOperations,
		...operations,
	};
	const userId = await creation.createPersistedPocketUser(params);
	return hydrateCreatedUser(userId, creation);
};
