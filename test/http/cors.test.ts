import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';

import {
	createCorsOptions,
	isPasswordlessOriginAllowed,
	isProductionCorsRequestAllowed,
	isTrustedApplicationOrigin,
} from '../../src/http/security/cors.js';

describe('production CORS policy', () => {
	it('allows trusted application origins', () => {
		assert.equal(isProductionCorsRequestAllowed('https://organized-app.com', '/api/v3/users'), true);
		assert.equal(isTrustedApplicationOrigin('https://organized-app.com'), true);
		assert.equal(isTrustedApplicationOrigin('https://attacker.example'), false);
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

	it('allows every custom header consumed by browser API routes', () => {
		const request = {
			originalUrl: '/api/v3/users/user-1/backup',
			header: (name: string) => name === 'Origin'
				? 'https://organized-app.com'
				: undefined,
		} as Request;

		const options = createCorsOptions(request, true);

		assert.deepEqual(options.allowedHeaders, [
			'Authorization',
			'Content-Type',
			'AppClient',
			'AppVersion',
			'AppLanguage',
			'Language',
			'Metadata',
			'Installation',
			'User',
		]);
	});
});

describe('passwordless sign-in origins', () => {
	it('allows trusted applications in production', () => {
		assert.equal(isPasswordlessOriginAllowed('https://organized-app.com', true), true);
		assert.equal(isPasswordlessOriginAllowed('https://attacker.example', true), false);
	});

	it('allows only exact local hosts outside production', () => {
		assert.equal(isPasswordlessOriginAllowed('http://localhost:5173', false), true);
		assert.equal(isPasswordlessOriginAllowed('http://127.0.0.1:3000', false), true);
		assert.equal(isPasswordlessOriginAllowed('https://localhost.attacker.example', false), false);
	});
});
