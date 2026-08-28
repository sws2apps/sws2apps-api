import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isProductionCorsRequestAllowed } from '../../src/http/security/cors.js';

describe('production CORS policy', () => {
	it('allows trusted application origins', () => {
		assert.equal(isProductionCorsRequestAllowed('https://organized-app.com', '/api/v3/users'), true);
	});

	it('allows the explicitly public cross-origin paths', () => {
		assert.equal(isProductionCorsRequestAllowed('https://example.com', '/app-version'), true);
		assert.equal(
			isProductionCorsRequestAllowed('https://example.com', '/api/public/source-material?language=E'),
			true,
		);
	});

	it('does not treat a partial path as an allowed public endpoint', () => {
		assert.equal(isProductionCorsRequestAllowed('https://example.com', '/api'), false);
		assert.equal(isProductionCorsRequestAllowed('https://example.com', '/'), false);
	});

	it('rejects requests without an Origin header', () => {
		assert.equal(isProductionCorsRequestAllowed(undefined, '/app-version'), false);
	});
});
