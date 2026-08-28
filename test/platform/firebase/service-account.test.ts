import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeServiceAccount } from '../../../src/platform/firebase/service-account.js';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

describe('Firebase service-account configuration', () => {
	it('decodes the standard Google service-account field names', () => {
		const encodedConfiguration = encode({
			project_id: 'organized-production',
			client_email: 'firebase@example.com',
			private_key: 'private-key-value',
		});

		const serviceAccount = decodeServiceAccount(encodedConfiguration);

		assert.equal(serviceAccount.projectId, 'organized-production');
		assert.equal(serviceAccount.clientEmail, 'firebase@example.com');
		assert.equal(serviceAccount.privateKey, 'private-key-value');
	});

	it('rejects malformed base64 configuration', () => {
		assert.throws(
			() => decodeServiceAccount('not-a-service-account'),
			/GOOGLE_CONFIG_BASE64 must contain a valid Firebase service account/,
		);
	});

	it('rejects JSON documents missing credential fields', () => {
		assert.throws(
			() => decodeServiceAccount(encode({ project_id: 'organized-production' })),
			/GOOGLE_CONFIG_BASE64 must contain a valid Firebase service account/,
		);
	});
});
