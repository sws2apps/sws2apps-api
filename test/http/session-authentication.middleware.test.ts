import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import {
	requireAuthenticatedSession,
	requirePocketSession,
	type SessionAuthenticationDependencies,
} from '#http/middleware/session-authentication.middleware.js';
import { User } from '#modules/users/user.js';
import type { UserSession } from '#modules/users/types/user.types.js';

const createAuthenticatedUser = (mfaEnabled = false) => {
	const user = new User('user-1');
	user.profile.mfa_enabled = mfaEnabled;
	const session = {
		visitorid: 'visitor-1',
		mfaVerified: false,
	} as UserSession;
	user.sessions = [session];

	return { user, session };
};

const createDependencies = (
	overrides: Partial<SessionAuthenticationDependencies> = {},
) => {
	const { user, session } = createAuthenticatedUser();
	let refreshCount = 0;

	const dependencies: SessionAuthenticationDependencies = {
		verifyToken: async () => 'authentication-user-1',
		resolveSession: () => ({ status: 'authenticated', user, session }),
		resolvePocketUser: () => user,
		refreshSession: async () => {
			refreshCount += 1;
		},
		...overrides,
	};

	return {
		dependencies,
		user,
		session,
		getRefreshCount: () => refreshCount,
	};
};

type SessionMiddleware = (
	request: Request,
	response: Response,
	next: NextFunction,
) => Promise<void>;

const runSessionMiddleware = async (
	middleware: SessionMiddleware,
	options: {
		authorization?: string;
		visitorId?: string;
		path?: string;
	} = {},
) => {
	const state: {
		statusCode?: number;
		body?: unknown;
		continued: boolean;
		nextError?: unknown;
		clearedCookies: string[];
		locals: Record<string, unknown>;
	} = {
		continued: false,
		clearedCookies: [],
		locals: {},
	};
	const headers: Record<string, string> = {};
	if (options.authorization) headers.authorization = options.authorization;
	const request = {
		headers,
		signedCookies: options.visitorId ? { visitorid: options.visitorId } : {},
		path: options.path ?? '/resource',
		clientIp: '192.0.2.1',
	} as unknown as Request;
	const response = {
		locals: state.locals,
		status(statusCode: number) {
			state.statusCode = statusCode;
			return this;
		},
		json(body: unknown) {
			state.body = body;
			return this;
		},
		clearCookie(name: string) {
			state.clearedCookies.push(name);
			return this;
		},
	} as unknown as Response;
	const next = ((error?: unknown) => {
		state.continued = error === undefined;
		state.nextError = error;
	}) as NextFunction;

	await middleware(request, response, next);
	return state;
};

const runAuthentication = (
	dependencies: SessionAuthenticationDependencies,
	options: Parameters<typeof runSessionMiddleware>[1] = {},
) => runSessionMiddleware(requireAuthenticatedSession(dependencies), options);

const runPocketAuthentication = (
	dependencies: SessionAuthenticationDependencies,
	options: Parameters<typeof runSessionMiddleware>[1] = {},
) => runSessionMiddleware(requirePocketSession(dependencies), options);

describe('session authentication middleware', () => {
	it('rejects a missing bearer token before authentication', async () => {
		const { dependencies } = createDependencies();
		const state = await runAuthentication(dependencies);

		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
		assert.equal(state.continued, false);
	});

	it('rejects a token that does not resolve to an authenticated identity', async () => {
		const { dependencies } = createDependencies({
			verifyToken: async () => undefined,
		});
		const state = await runAuthentication(dependencies, {
			authorization: 'Bearer valid-token',
			visitorId: 'visitor-1',
		});

		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'LOGIN_FIRST' });
	});

	it('rejects a revoked device before resolving its session', async () => {
		const { dependencies } = createDependencies();
		const state = await runAuthentication(dependencies, {
			authorization: 'Bearer valid-token',
		});

		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'DEVICE_REVOKED' });
	});

	it('clears the visitor cookie when the session was revoked', async () => {
		const { user } = createAuthenticatedUser();
		const { dependencies } = createDependencies({
			resolveSession: () => ({ status: 'session-not-found', user }),
		});
		const state = await runAuthentication(dependencies, {
			authorization: 'Bearer valid-token',
			visitorId: 'visitor-1',
		});

		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'SESSION_REVOKED' });
		assert.deepEqual(state.clearedCookies, ['visitorid']);
	});

	it('requires MFA when the active session is not verified', async () => {
		const { user, session } = createAuthenticatedUser(true);
		const { dependencies } = createDependencies({
			resolveSession: () => ({ status: 'authenticated', user, session }),
		});
		const state = await runAuthentication(dependencies, {
			authorization: 'Bearer valid-token',
			visitorId: 'visitor-1',
		});

		assert.equal(state.statusCode, 401);
		assert.deepEqual(state.body, { message: 'LOGIN_FIRST' });
		assert.equal(state.locals.currentUser, user);
	});

	it('refreshes an authenticated validation session and continues', async () => {
		const context = createDependencies();
		const state = await runAuthentication(context.dependencies, {
			authorization: 'Bearer valid-token',
			visitorId: 'visitor-1',
			path: '/validate-me',
		});

		assert.equal(state.continued, true);
		assert.equal(state.nextError, undefined);
		assert.equal(state.locals.currentUser, context.user);
		assert.equal(context.getRefreshCount(), 1);
	});
});

describe('Pocket session authentication middleware', () => {
	it('rejects a request without a signed visitor cookie', async () => {
		const { dependencies } = createDependencies();
		const state = await runPocketAuthentication(dependencies);

		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'DEVICE_REVOKED' });
		assert.equal(state.continued, false);
	});

	it('clears the visitor cookie when its Pocket account no longer exists', async () => {
		const { dependencies } = createDependencies({
			resolvePocketUser: () => undefined,
		});
		const state = await runPocketAuthentication(dependencies, {
			visitorId: 'visitor-1',
		});

		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'ACCOUNT_NOT_FOUND' });
		assert.deepEqual(state.clearedCookies, ['visitorid']);
	});

	it('attaches the Pocket user and continues ordinary requests', async () => {
		const context = createDependencies();
		const state = await runPocketAuthentication(context.dependencies, {
			visitorId: 'visitor-1',
		});

		assert.equal(state.continued, true);
		assert.equal(state.locals.currentUser, context.user);
		assert.equal(context.getRefreshCount(), 0);
	});

	it('refreshes the Pocket session during validation', async () => {
		const context = createDependencies();
		const state = await runPocketAuthentication(context.dependencies, {
			visitorId: 'visitor-1',
			path: '/validate-me',
		});

		assert.equal(state.continued, true);
		assert.equal(state.locals.currentUser, context.user);
		assert.equal(context.getRefreshCount(), 1);
	});
});
