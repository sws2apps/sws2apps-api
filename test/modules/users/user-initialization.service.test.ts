import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initializeUsers } from '#modules/users/index.js';
import { User } from '#modules/users/user.js';

describe('user initialization', () => {
	it('loads identities before publishing users to the application cache', async () => {
		const users = [new User('user-1'), new User('user-2')];
		const completedOperations: string[] = [];

		await initializeUsers({
			loadUsers: async () => {
				completedOperations.push('users');
				return users;
			},
			loadIdentities: async (loadedUsers) => {
				assert.equal(loadedUsers, users);
				loadedUsers[0]!.email = 'user@example.com';
				completedOperations.push('identities');
			},
			replaceUsers: (loadedUsers) => {
				assert.equal(loadedUsers, users);
				assert.equal(loadedUsers[0]?.email, 'user@example.com');
				completedOperations.push('cache');
			},
		});

		assert.deepEqual(completedOperations, ['users', 'identities', 'cache']);
	});

	it('does not publish users when identity enrichment fails', async () => {
		let cacheReplaced = false;

		await assert.rejects(
			initializeUsers({
				loadUsers: async () => [new User('user-1')],
				loadIdentities: async () => {
					throw new Error('Identity provider unavailable');
				},
				replaceUsers: () => {
					cacheReplaced = true;
				},
			}),
			/Identity provider unavailable/,
		);

		assert.equal(cacheReplaced, false);
	});
});
