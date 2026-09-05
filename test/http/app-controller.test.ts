import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';

import { applicationVersion } from '#config/application.js';
import { errorHandler, getRoot, invalidEndpointHandler } from '#http/app.controller.js';

type ResponseState = {
	statusCode?: number;
	body?: unknown;
	locals: Record<string, unknown>;
};

const createResponse = () => {
	const state: ResponseState = { locals: {} };
	const response = {
		locals: state.locals,
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

describe('application HTTP handlers', () => {
	it('returns the existing API identity response from the root handler', async () => {
		const { response, state } = createResponse();

		await getRoot(request, response);

		assert.equal(state.statusCode, 200);
		assert.deepEqual(state.body, { message: `SWS Apps API services v${applicationVersion}` });
		assert.equal(state.locals.type, 'info');
	});

	it('returns the existing response for an unknown endpoint', async () => {
		const { response, state } = createResponse();

		await invalidEndpointHandler(request, response);

		assert.equal(state.statusCode, 404);
		assert.deepEqual(state.body, { message: 'error_api_invalid-endpoint' });
		assert.equal(state.locals.type, 'warn');
	});

	it('does not expose an unexpected internal error', () => {
		const { response, state } = createResponse();

		errorHandler(new Error('sensitive detail'), request, response, () => undefined);

		assert.equal(state.statusCode, 500);
		assert.deepEqual(state.body, { message: 'error_api_internal-error' });
	});

	it('handles non-Error values without failing again', () => {
		for (const thrownValue of [null, 'unexpected failure', { reason: 'unknown' }]) {
			const { response, state } = createResponse();

			errorHandler(thrownValue, request, response, () => undefined);

			assert.equal(state.statusCode, 500);
			assert.deepEqual(state.body, { message: 'error_api_internal-error' });
		}
	});

	it('preserves the existing normalized Firebase error code', () => {
		const { response, state } = createResponse();
		const error = Object.assign(new Error('authentication failed'), {
			errorInfo: { code: 'auth/id-token-expired' },
		});

		errorHandler(error, request, response, () => undefined);

		assert.equal(state.statusCode, 500);
		assert.deepEqual(state.body, { message: 'error_auth_id-token-expired' });
	});

	it('does not reflect malformed provider error codes', () => {
		const { response, state } = createResponse();
		const error = {
			errorInfo: { code: 'auth/private/detail/that-should-not-be-public' },
		};

		errorHandler(error, request, response, () => undefined);

		assert.equal(state.statusCode, 500);
		assert.deepEqual(state.body, { message: 'error_api_internal-error' });
	});
});
