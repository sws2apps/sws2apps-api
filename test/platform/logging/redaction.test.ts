import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { redactLogContext } from '../../../src/platform/logging/redaction.js';

describe('log context redaction', () => {
	it('redacts credentials and personal email addresses', () => {
		const context = redactLogContext({
			authorization: 'Bearer secret-token',
			email: 'person@example.com',
			service: 'authentication',
		});

		assert.deepEqual(context, {
			authorization: '[REDACTED]',
			email: '[REDACTED]',
			service: 'authentication',
		});
	});

	it('redacts sensitive values inside nested objects and arrays', () => {
		const context = redactLogContext({
			request: {
				cookie: 'visitorid=signed-value',
				items: [{ accessCode: '12345678', status: 'pending' }],
			},
		});

		assert.deepEqual(context, {
			request: {
				cookie: '[REDACTED]',
				items: [{ accessCode: '[REDACTED]', status: 'pending' }],
			},
		});
	});
});
