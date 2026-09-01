import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { redactLogContext } from '#platform/logging/redaction.js';

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

	it('redacts personal request identifiers and fingerprints', () => {
		const result = redactLogContext({
			userId: 'user-1',
			congregationId: 'congregation-1',
			ip: '192.0.2.1',
			browser: 'Example Browser',
			method: 'GET',
		});

		assert.deepEqual(result, {
			userId: '[REDACTED]',
			congregationId: '[REDACTED]',
			ip: '[REDACTED]',
			browser: '[REDACTED]',
			method: 'GET',
		});
	});
});
