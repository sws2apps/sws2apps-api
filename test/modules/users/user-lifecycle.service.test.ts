import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	deleteUser,
	removeOutdatedUserSessions,
	type UserSession,
} from '#modules/users/index.js';
import { User } from '#modules/users/user.js';

const visitorDetails: UserSession['visitor_details'] = {
	browser: 'Firefox',
	ip: '192.0.2.1',
	ipLocation: {
		city: 'Antananarivo',
		continent_code: 'AF',
		country_code: 'MG',
		country_name: 'Madagascar',
		timezone: 'Indian/Antananarivo',
	},
	isMobile: false,
	os: 'Linux',
};

const createSession = (identifier: string, lastSeen: string): UserSession => ({
	identifier,
	visitorid: `visitor-${identifier}`,
	last_seen: lastSeen,
	visitor_details: visitorDetails,
});

describe('user deletion lifecycle', () => {
	it('deletes persisted identity before cache removal and membership refresh', async () => {
		const congregation = new Congregation('congregation-1');
		const user = new User('user-1');
		user.profile.auth_uid = 'authentication-user-1';
		user.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: ['publisher'],
		};
		const operations: string[] = [];

		await deleteUser(user.id, {
			findUserById: () => user,
			findCongregationById: (congregationId) => {
				assert.equal(congregationId, congregation.id);
				return congregation;
			},
			deletePersistedUser: async (userId) => {
				assert.equal(userId, user.id);
				operations.push('persisted-user');
			},
			deleteAuthenticationUser: async (authenticationUserId) => {
				assert.equal(authenticationUserId, 'authentication-user-1');
				operations.push('authentication-user');
			},
			removeUserById: (userId) => {
				assert.equal(userId, user.id);
				operations.push('cache');
			},
			refreshMembers: (refreshedCongregation) => {
				assert.equal(refreshedCongregation, congregation);
				operations.push('members');
			},
		});

		assert.deepEqual(operations, [
			'persisted-user',
			'authentication-user',
			'cache',
			'members',
		]);
	});

	it('does not remove cached state when persisted deletion fails', async () => {
		const operations: string[] = [];

		await assert.rejects(
			deleteUser('user-1', {
				findUserById: () => new User('user-1'),
				deletePersistedUser: async () => {
					operations.push('persisted-user');
					throw new Error('Storage unavailable');
				},
				removeUserById: () => {
					operations.push('cache');
				},
			}),
			/Storage unavailable/,
		);

		assert.deepEqual(operations, ['persisted-user']);
	});
});

describe('outdated user session cleanup', () => {
	it('removes sessions older than six months and preserves undated legacy sessions', async () => {
		const userWithOldSession = new User('user-1');
		const oldSession = createSession('old', '2026-03-02T23:59:59.999Z');
		const currentSession = createSession('current', '2026-03-03T00:00:00.001Z');
		const legacySession = createSession('legacy', '');
		userWithOldSession.sessions = [oldSession, currentSession, legacySession];

		const currentUser = new User('user-2');
		currentUser.sessions = [createSession('recent', '2026-09-01T00:00:00.000Z')];
		const updatedUsers: string[] = [];
		const logMessages: string[] = [];

		await removeOutdatedUserSessions({
			getUsers: () => [userWithOldSession, currentUser],
			getCurrentTime: () => new Date('2026-09-03T00:00:00.000Z'),
			updateSessions: async (user, sessions) => {
				updatedUsers.push(user.id);
				user.sessions = sessions;
			},
			log: (_level, message) => {
				logMessages.push(message);
			},
		});

		assert.deepEqual(updatedUsers, [userWithOldSession.id]);
		assert.deepEqual(userWithOldSession.sessions, [currentSession, legacySession]);
		assert.deepEqual(currentUser.sessions, [
			createSession('recent', '2026-09-01T00:00:00.000Z'),
		]);
		assert.deepEqual(logMessages, [
			'cleaning outdated user sessions ...',
			'outdated sessions cleanup completed.',
		]);
	});

	it('contains persistence failures and records a warning', async () => {
		const firstUser = new User('user-1');
		firstUser.sessions = [createSession('old-1', '2026-01-01T00:00:00.000Z')];
		const secondUser = new User('user-2');
		secondUser.sessions = [createSession('old-2', '2026-01-01T00:00:00.000Z')];
		const updatedUsers: string[] = [];
		const logs: { level: string; message: string }[] = [];

		await removeOutdatedUserSessions({
			getUsers: () => [firstUser, secondUser],
			getCurrentTime: () => new Date('2026-09-03T00:00:00.000Z'),
			updateSessions: async (user) => {
				updatedUsers.push(user.id);
				throw new Error('Storage unavailable');
			},
			log: (level, message) => {
				logs.push({ level, message });
			},
		});

		assert.deepEqual(updatedUsers, [firstUser.id]);
		assert.deepEqual(logs, [
			{ level: 'info', message: 'cleaning outdated user sessions ...' },
			{
				level: 'warn',
				message: 'an error occurred while removing outdated sessions',
			},
		]);
	});
});
