import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateUserMfaSecret } from '#modules/mfa/user-secret.js';

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
