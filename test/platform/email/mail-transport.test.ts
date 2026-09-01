import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMailTransportOptions } from '#platform/email/mail-transport.js';

describe('email transport security', () => {
	it('uses an encrypted SMTP connection with the configured credentials', () => {
		const options = buildMailTransportOptions('sender@example.com', 'secret');

		assert.equal(options.secure, true);
		assert.deepEqual(options.auth, {
			user: 'sender@example.com',
			pass: 'secret',
		});
	});

	it('does not disable TLS certificate validation', () => {
		const options = buildMailTransportOptions('sender@example.com', 'secret');

		assert.equal(options.tls?.rejectUnauthorized, undefined);
	});
});
