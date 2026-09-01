import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { requireCurrentUserResource } from '#http/middleware/user-resource-authorization.middleware.js';

const createResponse = (authenticatedUserId?: string) => {
	const state: {
		statusCode?: number;
		body?: unknown;
		locals: Record<string, unknown>;
	} = {
		locals: authenticatedUserId
			? { currentUser: { id: authenticatedUserId } }
			: {},
	};

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

describe('user resource authorization', () => {
	it('allows an authenticated user to access their own account resource', () => {
		const request = { params: { id: 'user-1' } } as unknown as Request;
		const { response } = createResponse('user-1');
		let continued = false;
		const next = (() => {
			continued = true;
		}) as NextFunction;

		requireCurrentUserResource(request, response, next);

		assert.equal(continued, true);
	});

	it('rejects access to a different user account', () => {
		const request = { params: { id: 'user-2' } } as unknown as Request;
		const { response, state } = createResponse('user-1');
		let continued = false;
		const next = (() => {
			continued = true;
		}) as NextFunction;

		requireCurrentUserResource(request, response, next);

		assert.equal(continued, false);
		assert.equal(state.statusCode, 403);
		assert.deepEqual(state.body, { message: 'error_api_unauthorized-request' });
	});

	it('rejects access when authentication context is missing', () => {
		const request = { params: { id: 'user-1' } } as unknown as Request;
		const { response, state } = createResponse();

		requireCurrentUserResource(request, response, (() => undefined) as NextFunction);

		assert.equal(state.statusCode, 403);
	});
});
