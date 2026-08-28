import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';

import { errorHandler, getRoot, invalidEndpointHandler } from '../../src/v3/controllers/app_controller.js';

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
		assert.deepEqual(state.body, { message: `SWS Apps API services v${process.env.npm_package_version}` });
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
		const originalLog = console.log;
		console.log = () => undefined;

		try {
			errorHandler(new Error('sensitive detail') as never, request, response, () => undefined);
		} finally {
			console.log = originalLog;
		}

		assert.equal(state.statusCode, 500);
		assert.deepEqual(state.body, { message: 'error_api_internal-error' });
	});

	it('preserves the existing normalized Firebase error code', () => {
		const { response, state } = createResponse();
		const originalLog = console.log;
		console.log = () => undefined;
		const error = Object.assign(new Error('authentication failed'), {
			errorInfo: { code: 'auth/id-token-expired' },
		});

		try {
			errorHandler(error as never, request, response, () => undefined);
		} finally {
			console.log = originalLog;
		}

		assert.equal(state.statusCode, 500);
		assert.deepEqual(state.body, { message: 'error_auth_id-token-expired' });
	});
});
