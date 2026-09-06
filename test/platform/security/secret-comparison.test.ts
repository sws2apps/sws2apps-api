import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	hashSecretValue,
	isSecretValueMatchingHash,
} from '#platform/security/secret-comparison.js';

describe('secret comparison', () => {
	it('matches a value against its own salted digest', () => {
		const digest = hashSecretValue('123456');

		assert.equal(isSecretValueMatchingHash(digest, '123456'), true);
	});

	it('rejects values that differ from the original secret', () => {
		const digest = hashSecretValue('sécret');

		assert.equal(isSecretValueMatchingHash(digest, 'secret'), false);
		assert.equal(isSecretValueMatchingHash(digest, 'sécret7'), false);
	});

	it('produces a distinct digest for each call even for the same value', () => {
		const firstDigest = hashSecretValue('123456');
		const secondDigest = hashSecretValue('123456');

		assert.notEqual(firstDigest, secondDigest);
		assert.equal(firstDigest, firstDigest);
	});

	it('rejects malformed digests without matching', () => {
		assert.equal(isSecretValueMatchingHash('not-a-digest', '123456'), false);
	});
});