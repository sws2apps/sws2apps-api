import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { User } from '#modules/users/index.js';
import type { UserSession } from '#modules/users/index.js';
import {
	AuthenticationSessionError,
	createAuthenticationSession,
	refreshAuthenticationSession,
} from '#modules/auth/index.js';

const originalVisitorDetails: UserSession['visitor_details'] = {
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

const refreshedVisitorDetails: UserSession['visitor_details'] = {
	...originalVisitorDetails,
	browser: 'Chrome',
	ip: '198.51.100.2',
};

const existingSession: UserSession = {
	identifier: 'existing-session',
	visitorid: 'existing-visitor',
	last_seen: '2026-01-01T00:00:00.000Z',
	mfaVerified: false,
	visitor_details: originalVisitorDetails,
};

const otherSession: UserSession = {
	...existingSession,
	identifier: 'other-session',
	visitorid: 'other-visitor',
};

describe('authentication session management', () => {
	it('rejects session creation before external work when the user is missing', async () => {
		let visitorDetailsRequested = false;

		await assert.rejects(
			createAuthenticationSession(
				{
					userId: 'missing-user',
					visitorId: 'visitor-1',
					visitorIp: '192.0.2.1',
					headers: {},
					mfaVerified: false,
				},
				{
					findUserById: () => undefined,
					getVisitorDetails: async () => {
						visitorDetailsRequested = true;
						return originalVisitorDetails;
					},
				},
			),
			(error: unknown) => {
				return error instanceof AuthenticationSessionError
					&& error.code === 'USER_NOT_FOUND';
			},
		);

		assert.equal(visitorDetailsRequested, false);
	});

	it('rejects a missing session before refreshing visitor details', async () => {
		const user = { id: 'user-1', sessions: [] } as unknown as User;
		let visitorDetailsRequested = false;

		await assert.rejects(
			refreshAuthenticationSession(
				{
					userId: user.id,
					visitorId: 'missing-visitor',
					visitorIp: '192.0.2.1',
					headers: {},
				},
				{
					findUserById: () => user,
					getVisitorDetails: async () => {
						visitorDetailsRequested = true;
						return originalVisitorDetails;
					},
				},
			),
			(error: unknown) => {
				return error instanceof AuthenticationSessionError
					&& error.code === 'SESSION_NOT_FOUND';
			},
		);

		assert.equal(visitorDetailsRequested, false);
	});

	it('replaces the visitor session and records its current security context', async () => {
		const user = {
			id: 'user-1',
			sessions: [existingSession, otherSession],
		} as User;
		let savedSessions: UserSession[] = [];

		await createAuthenticationSession(
			{
				userId: user.id,
				visitorId: 'existing-visitor',
				visitorIp: '198.51.100.2',
				headers: { 'user-agent': 'Chrome' },
				mfaVerified: true,
			},
			{
				findUserById: () => user,
				getVisitorDetails: async () => refreshedVisitorDetails,
				getCurrentTime: () => new Date('2026-09-02T12:00:00.000Z'),
				createSessionIdentifier: () => 'new-session',
				updateSessions: async (savedUser, sessions) => {
					assert.equal(savedUser, user);
					savedSessions = sessions;
				},
			},
		);

		assert.deepEqual(savedSessions, [
			otherSession,
			{
				identifier: 'new-session',
				visitorid: 'existing-visitor',
				last_seen: '2026-09-02T12:00:00.000Z',
				mfaVerified: true,
				visitor_details: refreshedVisitorDetails,
			},
		]);
		assert.deepEqual(user.sessions, [existingSession, otherSession]);
	});

	it('refreshes only the matching visitor session', async () => {
		const user = {
			id: 'user-1',
			sessions: [existingSession, otherSession],
		} as User;
		let savedSessions: UserSession[] = [];

		await refreshAuthenticationSession(
			{
				userId: user.id,
				visitorId: 'existing-visitor',
				visitorIp: '198.51.100.2',
				headers: { 'user-agent': 'Chrome' },
			},
			{
				findUserById: () => user,
				getVisitorDetails: async () => refreshedVisitorDetails,
				getCurrentTime: () => new Date('2026-09-02T13:00:00.000Z'),
				updateSessions: async (_savedUser, sessions) => {
					savedSessions = sessions;
				},
			},
		);

		assert.deepEqual(savedSessions, [
			{
				...existingSession,
				last_seen: '2026-09-02T13:00:00.000Z',
				visitor_details: refreshedVisitorDetails,
			},
			otherSession,
		]);
		assert.deepEqual(user.sessions, [existingSession, otherSession]);
	});
});
