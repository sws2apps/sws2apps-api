import { User } from '../user.js';
import {
	getUserDetails,
	getUserIds,
} from '../repositories/user-lifecycle.repository.js';
import { getUserProfileCreatedAt } from '../repositories/user-metadata.repository.js';
import { requirePositiveBatchSize } from '#domain/persistence/batch-size.js';

export type UserHydrationDataSource = {
	getIds: typeof getUserIds;
	getDetails: typeof getUserDetails;
	getProfileCreatedAt: typeof getUserProfileCreatedAt;
};

const defaultDataSource: UserHydrationDataSource = {
	getIds: getUserIds,
	getDetails: getUserDetails,
	getProfileCreatedAt: getUserProfileCreatedAt,
};

export const hydrateUser = async (
	user: User,
	dataSource: UserHydrationDataSource = defaultDataSource,
): Promise<void> => {
	const data = await dataSource.getDetails(user.id);

	user.metadata = data.metadata;

	if (data.settings) {
		user.settings = data.settings;
	}

	user.sessions = data.sessions;
	user.profile = data.profile;

	if (user.profile.role === 'pocket' && !user.profile.createdAt) {
		user.profile.createdAt = await dataSource.getProfileCreatedAt(user.id);
	}

	user.flags = data.flags;
};

export const loadAllUsers = async (
	batchSize = 20,
	dataSource: UserHydrationDataSource = defaultDataSource,
): Promise<User[]> => {
	requirePositiveBatchSize(batchSize);
	const userIds = await dataSource.getIds();
	const users: User[] = [];

	for (let index = 0; index < userIds.length; index += batchSize) {
		const batch = userIds.slice(index, index + batchSize);
		const hydratedBatch = await Promise.all(
			batch.map(async (userId) => {
				const user = new User(userId);
				await hydrateUser(user, dataSource);
				return user;
			}),
		);

		users.push(...hydratedBatch);
	}

	return users;
};
