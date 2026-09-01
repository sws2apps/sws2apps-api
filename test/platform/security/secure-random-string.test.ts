import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	generateSecureRandomString,
	NUMERIC_CHARACTERS,
	UPPERCASE_ALPHANUMERIC_CHARACTERS,
} from '#platform/security/secure-random-string.js';

describe('secure random strings', () => {
	it('generates strings from the requested character set', () => {
		assert.match(generateSecureRandomString(6, NUMERIC_CHARACTERS), /^\d{6}$/);
		assert.match(
			generateSecureRandomString(8, UPPERCASE_ALPHANUMERIC_CHARACTERS),
			/^[A-Z0-9]{8}$/,
		);
	});

	it('rejects invalid lengths and character sets', () => {
		assert.throws(
			() => generateSecureRandomString(0, NUMERIC_CHARACTERS),
			RangeError,
		);
		assert.throws(
			() => generateSecureRandomString(6, 'A'),
			RangeError,
		);
	});
});
