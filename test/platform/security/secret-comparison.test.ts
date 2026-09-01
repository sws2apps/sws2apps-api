import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { areSecretValuesEqual } from '#platform/security/secret-comparison.js';

describe('security-sensitive string comparison', () => {
	it('accepts identical secret values', () => {
		assert.equal(areSecretValuesEqual('123456', '123456'), true);
	});

	it('rejects different values with equal or different lengths', () => {
		assert.equal(areSecretValuesEqual('123456', '654321'), false);
		assert.equal(areSecretValuesEqual('123456', '1234567'), false);
	});

	it('compares the exact UTF-8 value', () => {
		assert.equal(areSecretValuesEqual('sécret', 'sécret'), true);
		assert.equal(areSecretValuesEqual('sécret', 'secret'), false);
	});
});
