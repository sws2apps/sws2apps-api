import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { requireTrustedBrowserOrigin } from '#http/middleware/trusted-origin.middleware.js';

const createRequest = (origin?: string) => ({
	header: (name: string) => name === 'Origin' ? origin : undefined,
}) as Request;

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

describe('trusted browser origin middleware', () => {
	it('allows non-browser clients without an Origin header', () => {
		let continued = false;
		requireTrustedBrowserOrigin(true)(
			createRequest(),
			createResponse().response,
			(() => { continued = true; }) as NextFunction,
		);

		assert.equal(continued, true);
	});

	it('allows trusted production browser origins', () => {
		let continued = false;
		requireTrustedBrowserOrigin(true)(
			createRequest('https://organized-app.com'),
			createResponse().response,
			(() => { continued = true; }) as NextFunction,
		);

		assert.equal(continued, true);
	});

	it('rejects an untrusted production browser origin', () => {
		const result = createResponse();
		let continued = false;
		requireTrustedBrowserOrigin(true)(
			createRequest('https://attacker.example'),
			result.response,
			(() => { continued = true; }) as NextFunction,
		);

		assert.equal(continued, false);
		assert.equal(result.getStatusCode(), 403);
		assert.deepEqual(result.getResponseBody(), { message: 'ORIGIN_NOT_ALLOWED' });
	});

	it('allows development browser origins', () => {
		let continued = false;
		requireTrustedBrowserOrigin(false)(
			createRequest('http://localhost:5173'),
			createResponse().response,
			(() => { continued = true; }) as NextFunction,
		);

		assert.equal(continued, true);
	});
});
