import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestHandler } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { applicationVersion } from '#config/application.js';

const continueRequest: RequestHandler = (_request, _response, next) => {
	next();
};

const createHttpTestApp = () => createApp({
	internetConnection: continueRequest,
	requestState: continueRequest,
	requestLogging: continueRequest,
	serverReady: continueRequest,
});

const validClientHeaders = {
	appclient: 'pocket',
	appversion: '1.0.0',
};

describe('Express application HTTP contract', () => {
	it('serves the API identity through the complete Express response pipeline', async () => {
		const response = await request(createHttpTestApp()).get('/');

		assert.equal(response.status, 200);
		assert.deepEqual(response.body, {
			message: `SWS Apps API services v${applicationVersion}`,
		});
		assert.equal(response.headers['x-content-type-options'], 'nosniff');
	});

	it('returns the stable public response for an unknown endpoint', async () => {
		const response = await request(createHttpTestApp()).get('/not-a-real-endpoint');

		assert.equal(response.status, 404);
		assert.deepEqual(response.body, { message: 'error_api_invalid-endpoint' });
	});

	it('applies client headers before protected API routes', async () => {
		const response = await request(createHttpTestApp()).get('/api/v3/users/user-1/sessions');

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'INPUT_INVALID' });
	});

	it('applies authentication validation to protected user routes', async () => {
		const response = await request(createHttpTestApp())
			.get('/api/v3/users/user-1/sessions')
			.set(validClientHeaders);

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'INPUT_INVALID' });
	});

	it('validates public route headers without requiring client-version headers', async () => {
		const response = await request(createHttpTestApp()).get('/api/v3/public/feature-flags');

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'error_api_bad-request' });
	});

	it('parses JSON before applying passwordless request validation', async () => {
		const response = await request(createHttpTestApp())
			.post('/api/v3/user-passwordless-login')
			.set(validClientHeaders)
			.set('Origin', 'http://localhost:3000')
			.send({ email: 'not-an-email-address' });

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'error_api_bad-request' });
	});
});
