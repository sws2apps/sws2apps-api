import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Result, ValidationError } from 'express-validator';

import { formatError } from '../../src/http/validation-errors.js';

describe('validation error formatting', () => {
	it('joins field validation messages in their existing order', () => {
		const errors = {
			array: () => [
				{ type: 'field', path: 'email', msg: 'must be valid' },
				{ type: 'field', path: 'token', msg: 'is required' },
			],
		} as Result<ValidationError>;

		assert.equal(
			formatError(errors),
			'email: must be valid, token: is required',
		);
	});

	it('returns an empty string when validation succeeds', () => {
		const errors = { array: () => [] } as unknown as Result<ValidationError>;

		assert.equal(formatError(errors), '');
	});
});
