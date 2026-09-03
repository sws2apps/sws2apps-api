import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	loadUserIdentities,
	loadUserIdentity,
	updateUserAuthenticationEmail,
} from '#modules/users/index.js';
import { User } from '#modules/users/user.js';

describe('user identity loading', () => {
	it('loads external identity details without replacing an existing creation date', async () => {
		const user = new User('user-1');
		user.profile.role = 'vip';
		user.profile.auth_uid = 'authentication-user-1';
		user.profile.createdAt = '2025-01-01T00:00:00.000Z';

		await loadUserIdentity(user, {
			getAuthenticationDetails: async (authenticationUserId) => {
				assert.equal(authenticationUserId, 'authentication-user-1');

				return {
					email: 'user@example.com',
					auth_provider: 'google.com',
					createdAt: '2024-01-01T00:00:00.000Z',
				};
			},
		});

		assert.equal(user.email, 'user@example.com');
		assert.equal(user.auth_provider, 'google.com');
		assert.equal(user.profile.createdAt, '2025-01-01T00:00:00.000Z');
	});

	it('uses the authentication creation date when the profile has none', async () => {
		const user = new User('user-1');
		user.profile.role = 'vip';
		user.profile.auth_uid = 'authentication-user-1';

		await loadUserIdentity(user, {
			getAuthenticationDetails: async () => ({
				email: 'user@example.com',
				auth_provider: 'email',
				createdAt: '2024-01-01T00:00:00.000Z',
			}),
		});

		assert.equal(user.profile.createdAt, '2024-01-01T00:00:00.000Z');
	});

	it('does not query external identity data for Pocket users', async () => {
		const user = new User('pocket-user-1');
		let lookupCount = 0;

		await loadUserIdentity(user, {
			getAuthenticationDetails: async () => {
				lookupCount += 1;
				return undefined;
			},
		});

		assert.equal(lookupCount, 0);
	});

	it('loads users in bounded batches and rejects unsafe batch sizes', async () => {
		const users = Array.from({ length: 5 }, (_, index) => {
			const user = new User(`user-${index + 1}`);
			user.profile.role = 'vip';
			user.profile.auth_uid = `authentication-user-${index + 1}`;
			return user;
		});
		let activeLookups = 0;
		let maximumActiveLookups = 0;

		await loadUserIdentities(users, 2, {
			getAuthenticationDetails: async () => {
				activeLookups += 1;
				maximumActiveLookups = Math.max(maximumActiveLookups, activeLookups);
				await Promise.resolve();
				activeLookups -= 1;
				return undefined;
			},
		});

		assert.equal(maximumActiveLookups, 2);
		await assert.rejects(
			loadUserIdentities(users, 0),
			new RangeError('Batch size must be a positive integer'),
		);
	});
});

describe('user authentication email updates', () => {
	it('updates local state only after the authentication provider succeeds', async () => {
		const user = new User('user-1');
		user.profile.auth_uid = 'authentication-user-1';
		user.email = 'old@example.com';

		await assert.rejects(
			updateUserAuthenticationEmail(user, 'new@example.com', {
				updateAuthenticationEmail: async () => {
					throw new Error('Authentication provider unavailable');
				},
			}),
			/Authentication provider unavailable/,
		);

		assert.equal(user.email, 'old@example.com');
	});
});
