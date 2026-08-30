import { loadUserIdentities } from './user-identity.service.js';
import { UsersList } from './users.js';
import { loadAllUsers } from './users.repository.js';

export const initializeUsers = async (): Promise<void> => {
	const users = await loadAllUsers();
	await loadUserIdentities(users);
	UsersList.replace(users);
};
