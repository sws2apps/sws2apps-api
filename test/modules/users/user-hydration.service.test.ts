import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { User } from '#modules/users/user.js';
import {
	type UserHydrationDataSource,
	hydrateUser,
	loadAllUsers,
} from '#modules/users/services/user-hydration.service.js';

const createDataSource = (ids = ['user-1']): UserHydrationDataSource => {
	return {
		getIds: async () => ids,
		getProfileCreatedAt: async () => '2025-01-01T10:00:00.000Z',
		getDetails: async (userId) => {
			const defaults = new User(userId);
			const profile = structuredClone(defaults.profile);
			profile.firstname = { value: `User ${userId}`, updatedAt: 'profile-date' };

			return {
				settings: defaults.settings,
				profile,
				sessions: [],
				metadata: {
					user_bible_studies: '',
					user_field_service_reports: '',
					delegated_field_service_reports: '',
					sessions: '',
					user_settings: 'metadata-date',
				},
				flags: ['flag-1'],
			};
		},
	};
};

describe('user hydration', () => {
	it('populates user state and restores a missing Pocket creation date', async () => {
		const user = new User('user-1');

		await hydrateUser(user, createDataSource());

		assert.equal(user.profile.firstname.value, 'User user-1');
		assert.equal(user.profile.createdAt, '2025-01-01T10:00:00.000Z');
		assert.equal(user.metadata.user_settings, 'metadata-date');
		assert.deepEqual(user.flags, ['flag-1']);
	});

	it('constructs and hydrates every persisted user', async () => {
		const users = await loadAllUsers(1, createDataSource(['user-1', 'user-2']));

		assert.deepEqual(
			users.map((user) => user.id),
			['user-1', 'user-2'],
		);
		assert.equal(users[1]?.profile.firstname.value, 'User user-2');
	});
});
