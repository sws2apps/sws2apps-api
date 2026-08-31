import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { body, Result, ValidationError } from 'express-validator';

import {
	formatError,
	rejectInvalidRequest,
	validateRequest,
} from '../../src/http/validation-errors.js';

describe('validation error formatting', () => {
	it('joins field validation messages in their existing order', () => {
		const errors = {
			array: () => [
				{ type: 'field', path: 'email', msg: 'must be valid' },
				{ type: 'field', path: 'token', msg: 'is required' },
			],
		} as Result<ValidationError>;

		assert.equal(
			formatError(errors),
			'email: must be valid, token: is required',
		);
	});

	it('returns an empty string when validation succeeds', () => {
		const errors = { array: () => [] } as unknown as Result<ValidationError>;

		assert.equal(formatError(errors), '');
	});
});

describe('invalid request responses', () => {
	const createResponse = () => {
		let statusCode: number | undefined;
		let responseBody: unknown;
		const response = {
			locals: {},
			status(code: number) {
				statusCode = code;
				return this;
			},
			json(body: unknown) {
				responseBody = body;
				return this;
			},
		} as unknown as Response;

		return {
			response,
			getStatusCode: () => statusCode,
			getResponseBody: () => responseBody,
		};
	};

	it('returns the existing public error response for invalid input', async () => {
		const request = { body: { email: 'not-an-email' } } as Request;
		await body('email').isEmail().run(request);
		const result = createResponse();

		assert.equal(rejectInvalidRequest(request, result.response), true);
		assert.equal(result.getStatusCode(), 400);
		assert.deepEqual(result.getResponseBody(), {
			message: 'error_api_bad-request',
		});
		assert.equal(result.response.locals.type, 'warn');
		assert.match(result.response.locals.message, /^invalid input: email:/);
	});

	it('leaves the response untouched when input is valid', async () => {
		const request = { body: { email: 'person@example.com' } } as Request;
		await body('email').isEmail().run(request);
		const result = createResponse();

		assert.equal(rejectInvalidRequest(request, result.response), false);
		assert.equal(result.getStatusCode(), undefined);
		assert.equal(result.getResponseBody(), undefined);
	});

	it('stops middleware chain and sends 400 when validation fails', async () => {
		const request = { body: { email: 'not-an-email' } } as Request;
		await body('email').isEmail().run(request);
		const result = createResponse();
		let nextCalled = false;

		validateRequest(request, result.response, () => {
			nextCalled = true;
		});

		assert.equal(nextCalled, false);
		assert.equal(result.getStatusCode(), 400);
		assert.deepEqual(result.getResponseBody(), {
			message: 'error_api_bad-request',
		});
	});

	it('calls next when validation succeeds', async () => {
		const request = { body: { email: 'person@example.com' } } as Request;
		await body('email').isEmail().run(request);
		const result = createResponse();
		let nextCalled = false;

		validateRequest(request, result.response, () => {
			nextCalled = true;
		});

		assert.equal(nextCalled, true);
		assert.equal(result.getStatusCode(), undefined);
	});
});

