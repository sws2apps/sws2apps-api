import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { RequestHandler } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { applicationVersion } from '#config/application.js';
import { serverState } from '#platform/runtime/server-state.js';

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

const originalMinimumAppVersion = serverState.minimumAppVersion;

afterEach(() => {
	serverState.minimumAppVersion = originalMinimumAppVersion;
});

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

	it('lets a client that presents no client headers reach route validation', async () => {
		const response = await request(createHttpTestApp())
			.post('/api/v3/user-passwordless-login');

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'error_api_bad-request' });
	});

	it('still rejects an outdated Organized client before route validation', async () => {
		serverState.minimumAppVersion = '99.0.0';
		const response = await request(createHttpTestApp())
			.post('/api/v3/user-passwordless-login')
			.set({ appclient: 'organized', appversion: '1.0.0' });

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'CLIENT_VERSION_OUTDATED' });
	});

	it('lets a self-identified client reach route validation without a version', async () => {
		serverState.minimumAppVersion = '99.0.0';
		const response = await request(createHttpTestApp())
			.post('/api/v3/user-passwordless-login')
			.set('appclient', 'admin-tooling');

		assert.equal(response.status, 400);
		assert.deepEqual(response.body, { message: 'error_api_bad-request' });
	});

	it('rejects a declared version that names no client', async () => {
		const response = await request(createHttpTestApp())
			.post('/api/v3/user-passwordless-login')
			.set('appversion', '3.50.0');

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
