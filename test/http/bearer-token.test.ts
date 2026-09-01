import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	extractBearerToken,
	validateBearerAuthorization,
} from '#http/security/bearer-token.js';

describe('Bearer authorization header', () => {
	it('extracts a token from the expected scheme', () => {
		assert.equal(extractBearerToken('Bearer signed-token-value'), 'signed-token-value');
	});

	it('rejects missing tokens, extra values, and different schemes', () => {
		assert.equal(extractBearerToken('Bearer '), undefined);
		assert.equal(extractBearerToken('Bearer token extra'), undefined);
		assert.equal(extractBearerToken('Basic credentials'), undefined);
	});

	it('treats the scheme as case-sensitive', () => {
		assert.equal(extractBearerToken('bearer signed-token-value'), undefined);
	});

	it('accepts a valid authorization value for request validation', () => {
		assert.equal(validateBearerAuthorization('Bearer signed-token-value'), true);
	});

	it('rejects invalid authorization values with the existing validation errors', () => {
		assert.throws(
			() => validateBearerAuthorization('Basic credentials'),
			/Invalid token format/,
		);
		assert.throws(
			() => validateBearerAuthorization('Bearer undefined'),
			/Token is missing/,
		);
	});
});
