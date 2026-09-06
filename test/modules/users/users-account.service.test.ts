import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { UserSession } from '#modules/users/types/user.types.js';
import {
	bindInstallationToUser,
	findSessionIdentifierByVisitorId,
	getUserActiveSessions,
	projectUserSessions,
	revokeSessionForUser,
	UserAccountError,
} from '#modules/users/services/users-account.service.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('user account sessions', () => {
	let originalUsers: User[];

	beforeEach(() => {
		originalUsers = UsersList.list;
		UsersList.list = [];
	});

	afterEach(() => {
		UsersList.list = originalUsers;
	});

	it('projects session details without exposing the visitor identifier', () => {
		const sessions = [{
			identifier: 'session-1',
			visitorid: 'private-visitor-id',
			last_seen: '2026-08-30T10:00:00.000Z',
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
		}] satisfies UserSession[];

		const result = projectUserSessions(sessions, 'private-visitor-id');

		assert.equal(result[0].identifier, 'session-1');
		assert.equal(result[0].isSelf, true);
		assert.equal(result[0].country_name, 'Madagascar');
		assert.equal('visitorid' in result[0], false);
		assert.deepEqual(result[0].device, {
			browserName: 'Firefox',
			os: 'Windows',
			isMobile: false,
		});
	});

	it('resolves the authenticated visitor to its revocable session identifier', () => {
		const sessions = [
			{
				identifier: 'session-1',
				visitorid: 'visitor-1',
			},
			{
				identifier: 'session-2',
				visitorid: 'visitor-2',
			},
		] as UserSession[];

		assert.equal(
			findSessionIdentifierByVisitorId(sessions, 'visitor-2'),
			'session-2',
		);
		assert.equal(
			findSessionIdentifierByVisitorId(sessions, 'unknown-visitor'),
			undefined,
		);
	});

	it('returns a stable error when the account does not exist', () => {
		assert.throws(
			() => getUserActiveSessions('missing-user', 'visitor-1'),
			(error: unknown) => {
				return error instanceof UserAccountError
					&& error.code === 'USER_NOT_FOUND';
			},
		);
	});

	it('rejects an unknown session before attempting persistence', async () => {
		const user = new User('user-1');
		let persistenceAttempted = false;

		await assert.rejects(
			revokeSessionForUser(user, 'missing-session', {
				updateSessions: async () => {
					persistenceAttempted = true;
				},
			}),
			(error: unknown) => {
				return error instanceof UserAccountError
					&& error.code === 'SESSION_NOT_FOUND';
			},
		);

		assert.equal(persistenceAttempted, false);
	});

	it('persists remaining sessions before returning their safe projection', async () => {
		const user = new User('user-1');
		user.sessions = [
			{
				identifier: 'session-1',
				visitorid: 'visitor-1',
				last_seen: '2026-09-01T10:00:00.000Z',
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
			},
			{
				identifier: 'session-2',
				visitorid: 'visitor-2',
				last_seen: '2026-09-02T10:00:00.000Z',
				visitor_details: {
					browser: 'Chrome',
					os: 'Android',
					ip: '192.0.2.2',
					ipLocation: {
						continent_code: 'AF',
						country_name: 'Madagascar',
						country_code: 'MDG',
						city: 'Toamasina',
						timezone: 'Indian/Antananarivo',
					},
					isMobile: true,
				},
			},
		];

		const sessions = await revokeSessionForUser(user, 'session-1', {
			updateSessions: async (target, remainingSessions) => {
				assert.equal(target.sessions.length, 2);
				target.sessions = remainingSessions;
			},
		});

		assert.deepEqual(user.sessions.map((session) => session.identifier), ['session-2']);
		assert.equal(sessions[0]?.identifier, 'session-2');
		assert.equal(sessions[0]?.isSelf, false);
		assert.equal('visitorid' in sessions[0]!, false);
	});
});

describe('user installation binding', () => {
	it('skips binding when no installation id is provided', async () => {
		let registrationAttempted = false;

		await bindInstallationToUser('user-1', undefined, {
			registerInstallation: async () => {
				registrationAttempted = true;
			},
		});

		assert.equal(registrationAttempted, false);
	});

	it('links the authenticated user to the calling installation', async () => {
		let registeredUserId: string | undefined;
		let registeredInstallationId: string | undefined;

		await bindInstallationToUser('user-1', 'installation-1', {
			registerInstallation: async (installationId, userId) => {
				registeredInstallationId = installationId;
				registeredUserId = userId;
			},
		});

		assert.equal(registeredInstallationId, 'installation-1');
		assert.equal(registeredUserId, 'user-1');
	});

	it('treats a failed binding as best-effort and never rejects', async () => {
		await bindInstallationToUser('user-1', 'installation-1', {
			registerInstallation: async () => {
				throw new Error('storage failure');
			},
		});
	});
});
