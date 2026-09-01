import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { serverReadyChecker } from '#http/middleware/server-ready.middleware.js';
import { serverState } from '#platform/runtime/server-state.js';

type ResponseState = {
	statusCode?: number;
	body?: unknown;
	headers: Record<string, string>;
	locals: Record<string, unknown>;
};

const createResponse = () => {
	const state: ResponseState = { headers: {}, locals: {} };
	const response = {
		locals: state.locals,
		set(name: string, value: string) {
			state.headers[name] = value;
			return this;
		},
		status(code: number) {
			state.statusCode = code;
			return this;
		},
		json(body: unknown) {
			state.body = body;
			return this;
		},
	} as unknown as Response;

	return { response, state };
};

const request = {} as Request;

afterEach(() => {
	serverState.isReady = false;
});

describe('server readiness middleware', () => {
	it('continues when startup has completed', async () => {
		serverState.isReady = true;
		const { response } = createResponse();
		let continued = false;
		const next = (() => {
			continued = true;
		}) as NextFunction;

		await serverReadyChecker()(request, response, next);

		assert.equal(continued, true);
	});

	it('returns the existing retry response while startup is incomplete', async () => {
		const { response, state } = createResponse();
		let continued = false;
		const next = (() => {
			continued = true;
		}) as NextFunction;

		await serverReadyChecker()(request, response, next);

		assert.equal(continued, false);
		assert.equal(state.statusCode, 503);
		assert.equal(state.headers['Retry-After'], '30');
		assert.deepEqual(state.body, { message: 'SERVER_NOT_READY' });
	});
});
