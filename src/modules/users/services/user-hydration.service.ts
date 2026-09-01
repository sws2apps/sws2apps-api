import { User } from '../user.js';
import {
	getUserDetails,
	getUserIds,
} from '../repositories/user-lifecycle.repository.js';
import { getUserProfileCreatedAt } from '../repositories/user-metadata.repository.js';

export const hydrateUser = async (user: User): Promise<void> => {
	const data = await getUserDetails(user.id);

	user.metadata = data.metadata;

	if (data.settings) {
		user.settings = data.settings;
	}

	user.sessions = data.sessions;
	user.profile = data.profile;

	if (user.profile.role === 'pocket' && !user.profile.createdAt) {
		user.profile.createdAt = await getUserProfileCreatedAt(user.id);
	}

	user.flags = data.flags;
};

export const loadAllUsers = async (batchSize = 20): Promise<User[]> => {
	const userIds = await getUserIds();
	const users: User[] = [];

	for (let index = 0; index < userIds.length; index += batchSize) {
		const batch = userIds.slice(index, index + batchSize);
		const hydratedBatch = await Promise.all(
			batch.map(async (userId) => {
				const user = new User(userId);
				await hydrateUser(user);
				return user;
			}),
		);

		users.push(...hydratedBatch);
	}

	return users;
};
