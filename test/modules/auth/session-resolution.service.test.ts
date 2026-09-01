import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { User } from '#modules/users/user.js';
import type { UserSession } from '#modules/users/user.types.js';
import {
	resolveAuthenticatedSession,
	resolvePocketSessionUser,
} from '#modules/auth/session-resolution.service.js';

const session = { visitorid: 'visitor-1' } as UserSession;
const user = { id: 'user-1', sessions: [session] } as User;
const users = {
	findByAuthUid: (authenticationUserId: string) => authenticationUserId === 'auth-1' ? user : undefined,
	findByVisitorId: (visitorId: string) => visitorId === 'visitor-1' ? user : undefined,
};

describe('authentication session resolution', () => {
	it('resolves the user and matching visitor session', () => {
		assert.deepEqual(
			resolveAuthenticatedSession('auth-1', 'visitor-1', users),
			{ status: 'authenticated', user, session },
		);
	});

	it('distinguishes missing users from revoked sessions', () => {
		assert.deepEqual(
			resolveAuthenticatedSession('missing', 'visitor-1', users),
			{ status: 'user-not-found' },
		);
		assert.deepEqual(
			resolveAuthenticatedSession('auth-1', 'revoked', users),
			{ status: 'session-not-found', user },
		);
	});

	it('resolves Pocket users by their visitor session', () => {
		assert.equal(resolvePocketSessionUser('visitor-1', users), user);
		assert.equal(resolvePocketSessionUser('revoked', users), undefined);
	});
});
