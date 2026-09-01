import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Response } from 'express';

import { sendClientError, sendEmptySuccess, sendServerError, sendSuccess } from '#http/responses.js';

type ResponseState = {
	statusCode?: number;
	body?: unknown;
	ended: boolean;
	locals: Record<string, unknown>;
};

const createResponse = () => {
	const state: ResponseState = { ended: false, locals: {} };
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
		end() {
			state.ended = true;
			return this;
		},
	} as unknown as Response;

	return { response, state };
};

describe('HTTP response helpers', () => {
	it('sends a successful response with logging metadata', () => {
		const { response, state } = createResponse();

		sendSuccess(response, { message: 'OK' }, 'request completed');

		assert.equal(state.statusCode, 200);
		assert.deepEqual(state.body, { message: 'OK' });
		assert.deepEqual(state.locals, { type: 'info', message: 'request completed' });
	});

	it('sends stable client and server errors without exposing log details', () => {
		const client = createResponse();
		const server = createResponse();

		sendClientError(client.response, 404, 'RESOURCE_NOT_FOUND', 'private client context');
		sendServerError(server.response, 'INTERNAL_ERROR', 'private server context');

		assert.deepEqual(client.state.body, { message: 'RESOURCE_NOT_FOUND' });
		assert.equal(client.state.locals.message, 'private client context');
		assert.equal(server.state.statusCode, 500);
		assert.deepEqual(server.state.body, { message: 'INTERNAL_ERROR' });
	});

	it('ends an empty successful response without creating a body', () => {
		const { response, state } = createResponse();

		sendEmptySuccess(response, 'resource removed');

		assert.equal(state.statusCode, 204);
		assert.equal(state.body, undefined);
		assert.equal(state.ended, true);
	});
});
