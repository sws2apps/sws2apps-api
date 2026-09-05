import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	generateUserMfaSecret,
	MfaSecretError,
	parseUserMfaSecret,
} from '#modules/mfa/user-secret.js';

describe('user MFA secret generation', () => {
	it('creates a versioned TOTP provisioning payload', () => {
		const result = generateUserMfaSecret('user@example.com');
		const provisioningUrl = new URL(result.uri);

		assert.equal(result.version, 2);
		assert.ok(result.secret.length > 0);
		assert.equal(provisioningUrl.protocol, 'otpauth:');
		assert.equal(provisioningUrl.searchParams.get('digits'), '6');
		assert.equal(provisioningUrl.searchParams.get('period'), '30');
		assert.match(provisioningUrl.searchParams.get('issuer') || '', /^sws2apps/);
	});
});

describe('stored MFA secret parsing', () => {
	it('accepts the current versioned provisioning payload', () => {
		const secret = parseUserMfaSecret(JSON.stringify({
			secret: 'JBSWY3DPEHPK3PXP',
			uri: 'otpauth://totp/sws2apps:user@example.com',
			version: 2,
		}));

		assert.equal(secret.secret, 'JBSWY3DPEHPK3PXP');
		assert.equal(secret.version, 2);
	});

	it('rejects missing, malformed, and unsupported secret payloads', () => {
		const invalidPayloads = [
			undefined,
			'not-json',
			'[]',
			JSON.stringify({ secret: '', uri: 'otpauth://totp/test', version: 2 }),
			JSON.stringify({ secret: 'ABC', uri: 'https://example.com', version: 2 }),
			JSON.stringify({ secret: 'ABC', uri: 'otpauth://totp/test', version: 1 }),
		];

		for (const payload of invalidPayloads) {
			assert.throws(
				() => parseUserMfaSecret(payload),
				MfaSecretError,
			);
		}
	});
});
