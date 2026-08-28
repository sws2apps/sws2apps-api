import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateJsonSize } from '../../src/http/request-size.js';

describe('request body size calculation', () => {
	it('returns the UTF-8 byte size of JSON request data', () => {
		const requestBody = { message: 'hello' };

		assert.equal(calculateJsonSize(requestBody), Buffer.byteLength(JSON.stringify(requestBody), 'utf8'));
	});

	it('returns zero for absent, primitive, or circular data', () => {
		const circularValue: Record<string, unknown> = {};
		circularValue.self = circularValue;

		assert.equal(calculateJsonSize(undefined), 0);
		assert.equal(calculateJsonSize('text'), 0);
		assert.equal(calculateJsonSize(circularValue), 0);
	});
});
