import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	createApplicationUser,
	createPocketApplicationUser,
	type PocketNewParams,
	type UserNewParams,
} from '#modules/users/index.js';

const applicationUser: UserNewParams = {
	auth_uid: 'authentication-user-1',
	firstname: 'Ada',
	lastname: 'Lovelace',
	email: 'ada@example.com',
};

const pocketUser: PocketNewParams = {
	user_firstname: 'Grace',
	user_lastname: 'Hopper',
	user_secret_code: 'invitation-secret',
	cong_id: 'congregation-1',
	cong_role: ['publisher'],
	cong_person_uid: 'person-1',
};

describe('application user creation', () => {
	it('synchronizes identity, persists, hydrates, and then publishes the user', async () => {
		const completedOperations: string[] = [];

		const user = await createApplicationUser(applicationUser, {
			synchronizeEmail: async (authenticationUserId, email) => {
				assert.equal(authenticationUserId, applicationUser.auth_uid);
				assert.equal(email, applicationUser.email);
				completedOperations.push('email');
			},
			createPersistedUser: async (params) => {
				assert.deepEqual(params, applicationUser);
				completedOperations.push('persist');
				return 'user-1';
			},
			hydrateUser: async (createdUser) => {
				assert.equal(createdUser.id, 'user-1');
				createdUser.profile.firstname.value = 'Ada';
				completedOperations.push('hydrate');
			},
			loadIdentity: async (createdUser) => {
				createdUser.email = applicationUser.email;
				completedOperations.push('identity');
			},
			addUser: (createdUser) => {
				assert.equal(createdUser.profile.firstname.value, 'Ada');
				assert.equal(createdUser.email, applicationUser.email);
				completedOperations.push('cache');
			},
		});

		assert.equal(user.id, 'user-1');
		assert.deepEqual(completedOperations, [
			'email',
			'persist',
			'hydrate',
			'identity',
			'cache',
		]);
	});

	it('does not persist or publish when email synchronization fails', async () => {
		const completedOperations: string[] = [];

		await assert.rejects(
			createApplicationUser(applicationUser, {
				synchronizeEmail: async () => {
					completedOperations.push('email');
					throw new Error('Email synchronization failed');
				},
				createPersistedUser: async () => {
					completedOperations.push('persist');
					return 'user-1';
				},
				addUser: () => completedOperations.push('cache'),
			}),
			/Email synchronization failed/,
		);

		assert.deepEqual(completedOperations, ['email']);
	});

	it('does not synchronize an email when none was provided', async () => {
		const userWithoutEmail = { ...applicationUser, email: undefined };
		let synchronizedEmail = false;

		await createApplicationUser(userWithoutEmail, {
			synchronizeEmail: async () => {
				synchronizedEmail = true;
			},
			createPersistedUser: async () => 'user-1',
			hydrateUser: async () => undefined,
			loadIdentity: async () => undefined,
			addUser: () => undefined,
		});

		assert.equal(synchronizedEmail, false);
	});
});

describe('Pocket user creation', () => {
	it('persists and publishes through the shared hydration pipeline', async () => {
		const completedOperations: string[] = [];

		const user = await createPocketApplicationUser(pocketUser, {
			createPersistedPocketUser: async (params) => {
				assert.deepEqual(params, pocketUser);
				completedOperations.push('persist');
				return 'pocket-user-1';
			},
			hydrateUser: async (createdUser) => {
				createdUser.profile.role = 'pocket';
				completedOperations.push('hydrate');
			},
			loadIdentity: async (createdUser) => {
				assert.equal(createdUser.profile.role, 'pocket');
				completedOperations.push('identity');
			},
			addUser: () => completedOperations.push('cache'),
		});

		assert.equal(user.id, 'pocket-user-1');
		assert.deepEqual(completedOperations, [
			'persist',
			'hydrate',
			'identity',
			'cache',
		]);
	});
});
