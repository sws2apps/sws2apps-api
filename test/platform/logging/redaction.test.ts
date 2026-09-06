import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { redactLogContext } from '#platform/logging/redaction.js';

describe('log context redaction', () => {
	it('preserves all sensitive key variants and the exact IP boundary', () => {
		const keys = ['Authorization', 'cookie', 'EMAIL', 'password', 'secret', 'token', 'access_code', 'accessCode', 'master-key', 'backup', 'user.id', 'congregation_id', 'cong_id', 'congid', 'IP', 'browser'];
		const context = Object.fromEntries(keys.map((key) => [key, 'sensitive']));
		assert.deepEqual(redactLogContext({ ...context, shipment: 'safe' }), {
			...Object.fromEntries(keys.map((key) => [key, '[REDACTED]'])), shipment: 'safe',
		});
	});

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

	it('strips control characters from surviving context strings', () => {
		const result = redactLogContext({
			service: 'backup',
			status: 'chunk\rfinished\narrived',
			details: {
				labels: ['error\u001B[2Jcleared', 'ok'],
				attempts: 2,
			},
		});

		assert.deepEqual(result, {
			service: 'backup',
			status: 'chunk finished arrived',
			details: {
				labels: ['error [2Jcleared', 'ok'],
				attempts: 2,
			},
		});
	});

	it('does not leak control characters through array values', () => {
		const result = redactLogContext({ items: ['before\u0000after', 'plain'] });

		assert.deepEqual(result, { items: ['before after', 'plain'] });
	});
});
