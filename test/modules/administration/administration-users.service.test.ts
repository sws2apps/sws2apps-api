import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	deleteAdministrationUser,
	formatAdministrationSession,
	revokeAdministrationUserSession,
	updateAdministrationUser,
} from '#modules/administration/services/administration-users.service.js';
import { UsersList } from '#modules/users/index.js';
import { User } from '#modules/users/user.js';
import type { UserSession } from '#modules/users/types/user.types.js';

const session: UserSession = {
	identifier: 'session-1',
	visitorid: 'private-visitor-id',
	last_seen: '2026-08-28T10:00:00.000Z',
	visitor_details: {
		browser: 'Firefox',
		os: 'Windows',
		ip: '192.0.2.1',
		ipLocation: {
			continent_code: 'AF',
			country_name: 'Madagascar',
			country_code: 'MDG',
			city: 'Antananarivo',
			timezone: 'Indian/Antananarivo',
		},
		isMobile: false,
	},
};

describe('administration user sessions', () => {
	it('marks the administrator current session without exposing its visitor ID', () => {
		const result = formatAdministrationSession(session, 'private-visitor-id');

		assert.equal(result.isSelf, true);
		assert.equal('visitorid' in result, false);
		assert.deepEqual(result.device, {
			browserName: 'Firefox',
			os: 'Windows',
			isMobile: false,
		});
	});

	it('does not mark another session as the current session', () => {
		const result = formatAdministrationSession(session, 'different-visitor-id');

		assert.equal(result.isSelf, false);
	});
});

describe('administration user management', () => {
	let originalUsers: User[];

	beforeEach(() => {
		originalUsers = UsersList.list;
		UsersList.list = [];
	});

	afterEach(() => {
		UsersList.list = originalUsers;
	});

	it('updates profile and authentication email changes', async () => {
		const user = new User('user-1');
		user.email = 'old@example.test';
		user.profile.auth_uid = 'auth-user-1';
		user.profile.role = 'vip';
		UsersList.list = [user];

		const result = await updateAdministrationUser(
			user.id,
			{
				firstname: 'Jane',
				lastname: 'Doe',
				email: 'jane@example.test',
				roles: [],
			},
			'current-visitor',
			{
				updateProfile: async (target, profile) => {
					target.profile = profile;
				},
				updateAuthenticationEmail: async (target, email) => {
					target.email = email;
				},
			},
		);

		assert.equal(user.profile.firstname.value, 'Jane');
		assert.equal(user.profile.lastname.value, 'Doe');
		assert.equal(user.email, 'jane@example.test');
		assert.equal(result[0]?.profile.email, 'jane@example.test');
	});

	it('deletes a user and returns the remaining administration list', async () => {
		const deletedUser = new User('user-1');
		const remainingUser = new User('user-2');
		UsersList.list = [deletedUser, remainingUser];

		const result = await deleteAdministrationUser(
			deletedUser.id,
			'current-visitor',
			{
				deleteUserAccount: async (userId) => {
					UsersList.removeById(userId);
				},
			},
		);

		assert.deepEqual(result.map((user) => user.id), [remainingUser.id]);
	});

	it('revokes one session or every session as requested', async () => {
		const user = new User('user-1');
		const secondSession = { ...session, identifier: 'session-2', visitorid: 'visitor-2' };
		user.sessions = [session, secondSession];
		UsersList.list = [user];

		await revokeAdministrationUserSession(
			user.id,
			session.identifier,
			'current-visitor',
			{
				revokeSession: async (target, identifier) => {
					target.sessions = target.sessions.filter(
						(currentSession) => currentSession.identifier !== identifier,
					);
					return [];
				},
			},
		);
		assert.deepEqual(user.sessions.map((currentSession) => currentSession.identifier), ['session-2']);

		await revokeAdministrationUserSession(
			user.id,
			[],
			'current-visitor',
			{
				updateSessions: async (target, sessions) => {
					target.sessions = sessions;
				},
			},
		);
		assert.deepEqual(user.sessions, []);
	});
});
