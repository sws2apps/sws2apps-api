import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isEmailOneTimePasswordValid } from '../../../src/modules/auth/email-otp.js';

describe('email one-time password validation', () => {
	const oneTimePassword = {
		code: '123456',
		expiredAt: 2_000,
	};

	it('accepts a matching code before or at its expiration time', () => {
		assert.equal(isEmailOneTimePasswordValid(oneTimePassword, '123456', 1_999), true);
		assert.equal(isEmailOneTimePasswordValid(oneTimePassword, '123456', 2_000), true);
	});

	it('rejects an incorrect code', () => {
		assert.equal(isEmailOneTimePasswordValid(oneTimePassword, '654321', 1_999), false);
	});

	it('rejects an expired code even when its value matches', () => {
		assert.equal(isEmailOneTimePasswordValid(oneTimePassword, '123456', 2_001), false);
	});
});
