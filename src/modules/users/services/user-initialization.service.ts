import { loadUserIdentities } from './user-identity.service.js';
import { UsersList } from '../users.js';
import { loadAllUsers } from './user-hydration.service.js';
import type { User } from '../user.js';

export type UserInitializationOperations = {
	loadUsers: () => Promise<User[]>;
	loadIdentities: (users: User[]) => Promise<void>;
	replaceUsers: (users: User[]) => void;
};

const defaultInitializationOperations: UserInitializationOperations = {
	loadUsers: () => loadAllUsers(),
	loadIdentities: (users) => loadUserIdentities(users),
	replaceUsers: (users) => UsersList.replace(users),
};

export const initializeUsers = async (
	operations: Partial<UserInitializationOperations> = {},
): Promise<void> => {
	const initialization = {
		...defaultInitializationOperations,
		...operations,
	};
	const users = await initialization.loadUsers();

	await initialization.loadIdentities(users);
	initialization.replaceUsers(users);
};
