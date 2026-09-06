import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestHandler } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app.js';

const continueRequest: RequestHandler = (_request, _response, next) => {
	next();
};

const createDocumentationTestApp = () => createApp({
	internetConnection: continueRequest,
	requestState: continueRequest,
	requestLogging: continueRequest,
	serverReady: continueRequest,
});

describe('API documentation HTTP interface', () => {
	it('serves the current OpenAPI contract as JSON', async () => {
		const response = await request(createDocumentationTestApp()).get('/api-docs/openapi.json');

		assert.equal(response.status, 200);
		assert.match(response.headers['content-type'], /^application\/json/);
		assert.equal(response.body.openapi, '3.1.0');
		assert.equal(response.body.servers[0].url, '/api/v3');
	});

	it('serves a self-hosted Swagger UI compatible with the default content security policy', async () => {
		const response = await request(createDocumentationTestApp()).get('/api-docs');
		const contentSecurityPolicy = response.headers['content-security-policy'] as string;

		assert.equal(response.status, 200);
		assert.match(response.headers['content-type'], /^text\/html/);
		assert.match(response.text, /\/api-docs\/assets\/swagger-ui-bundle\.js/);
		assert.match(response.text, /\/api-docs\/swagger-initializer\.js/);
		assert.doesNotMatch(response.text, /<script[^>]*>\s*[^<]/i);
		assert.match(contentSecurityPolicy, /script-src 'self'/);
		assert.doesNotMatch(contentSecurityPolicy, /script-src [^;]*'unsafe-inline'/);
	});

	it('configures Swagger UI to load the local contract without remote validation', async () => {
		const response = await request(createDocumentationTestApp()).get('/api-docs/swagger-initializer.js');

		assert.equal(response.status, 200);
		assert.match(response.headers['content-type'], /javascript/);
		assert.match(response.text, /url: '\/api-docs\/openapi\.json'/);
		assert.match(response.text, /persistAuthorization: false/);
		assert.match(response.text, /validatorUrl: null/);
	});

	it('serves only explicitly allowed Swagger UI assets', async () => {
		const app = createDocumentationTestApp();
		const allowedResponse = await request(app).get('/api-docs/assets/swagger-ui.css');
		const unknownResponse = await request(app).get('/api-docs/assets/swagger-ui.css.map');

		assert.equal(allowedResponse.status, 200);
		assert.match(allowedResponse.headers['content-type'], /^text\/css/);
		assert.equal(unknownResponse.status, 404);
		assert.deepEqual(unknownResponse.body, { message: 'error_api_invalid-endpoint' });
	});
});
