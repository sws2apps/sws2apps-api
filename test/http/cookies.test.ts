import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSessionCookieOptions } from '../../src/http/security/cookies.js';

describe('session cookie security', () => {
	it('allows HTTP cookies only for exact local development hosts', () => {
		const localhostOptions = buildSessionCookieOptions('localhost', false);
		const loopbackOptions = buildSessionCookieOptions('127.0.0.1', false);

		assert.equal(localhostOptions.secure, false);
		assert.equal(localhostOptions.sameSite, 'lax');
		assert.equal(loopbackOptions.secure, false);
	});

	it('does not mistake a hostname containing localhost for a local host', () => {
		const options = buildSessionCookieOptions('localhost.example.com', false);

		assert.equal(options.secure, true);
		assert.equal(options.sameSite, 'none');
	});

	it('always uses secure cross-site cookies in production', () => {
		const options = buildSessionCookieOptions('localhost', true);

		assert.equal(options.secure, true);
		assert.equal(options.sameSite, 'none');
	});

	it('keeps session cookies HTTP-only and signed', () => {
		const options = buildSessionCookieOptions('organized-app.com', true);

		assert.equal(options.httpOnly, true);
		assert.equal(options.signed, true);
	});
});
