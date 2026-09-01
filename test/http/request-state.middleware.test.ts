import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { trackRequestState } from '#http/middleware/request-state.middleware.js';
import { serverState } from '#platform/runtime/server-state.js';
import type { RequestTrackerType } from '#platform/runtime/request-tracker.js';

const clientIp = '192.0.2.1';
let originalRequestTracker: RequestTrackerType[];

beforeEach(() => {
	originalRequestTracker = serverState.requestTracker;
	serverState.requestTracker = [];
});

afterEach(() => {
	serverState.requestTracker = originalRequestTracker;
});

const createTrackerEntry = (
	failedLoginAttempt: number,
	retryOn?: number,
): RequestTrackerType => ({
	ip: clientIp,
	city: 'Unknown',
	reqInProgress: false,
	failedLoginAttempt,
	retryOn,
});

const runRequestStateCheck = async () => {
	const state: {
		statusCode?: number;
		body?: unknown;
		continued: boolean;
		nextError?: unknown;
		finishListener?: () => void | Promise<void>;
		locals: Record<string, unknown>;
	} = {
		continued: false,
		locals: {},
	};
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
		on(event: string, listener: () => void | Promise<void>) {
			if (event === 'finish') state.finishListener = listener;
			return this;
		},
	} as unknown as Response;
	const next = ((error?: unknown) => {
		state.continued = error === undefined;
		state.nextError = error;
	}) as NextFunction;

	await trackRequestState()({ clientIp } as Request, response, next);
	return state;
};

describe('request state middleware', () => {
	it('tracks a new client and continues the request', async () => {
		const state = await runRequestStateCheck();

		assert.equal(state.continued, true);
		assert.equal(state.nextError, undefined);
		assert.deepEqual(serverState.requestTracker, [
			{ ...createTrackerEntry(0), reqInProgress: true },
		]);
	});

	it('rejects a client while its temporary block is active', async () => {
		serverState.requestTracker = [createTrackerEntry(3, Date.now() + 60_000)];

		const state = await runRequestStateCheck();

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
		assert.equal(state.locals.type, 'warn');
	});

	it('removes an expired block and continues the request', async () => {
		serverState.requestTracker = [createTrackerEntry(3, Date.now() - 1)];

		const state = await runRequestStateCheck();

		assert.equal(state.continued, true);
		assert.deepEqual(serverState.requestTracker, []);
	});

	it('starts a temporary block after the failed-attempt threshold', async () => {
		serverState.requestTracker = [createTrackerEntry(3)];
		const beforeRequest = Date.now();

		const state = await runRequestStateCheck();

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'BLOCKED_TEMPORARILY' });
		assert.ok(state.finishListener);

		await state.finishListener();
		const blockedEntry = serverState.requestTracker[0]!;
		assert.equal(blockedEntry.failedLoginAttempt, 3);
		assert.equal(blockedEntry.reqInProgress, false);
		assert.ok(blockedEntry.retryOn! >= beforeRequest + 15 * 60_000);
	});
});
