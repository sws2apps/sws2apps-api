import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	decryptData,
	encryptData,
} from '#platform/encryption/encryption.js';

describe('encryption adapter', () => {
	it('encrypts and decrypts data with the server passphrase', () => {
		const originalText = 'private congregation data';

		const encryptedText = encryptData(originalText);
		const decryptedText = decryptData(encryptedText);

		assert.notEqual(encryptedText, originalText);
		assert.equal(decryptedText, originalText);
	});

	it('supports a caller-provided passphrase', () => {
		const originalText = JSON.stringify({ speaker: 'example' });
		const temporaryPassphrase = 'temporary-sharing-key';

		const encryptedText = encryptData(originalText, temporaryPassphrase);
		const decryptedText = decryptData(encryptedText, temporaryPassphrase);

		assert.equal(decryptedText, originalText);
	});

	it('does not treat malformed encrypted data as plaintext', () => {
		const malformedEncryptedText = 'not-valid-encrypted-data';
		const decryptedText = decryptData(malformedEncryptedText);

		assert.notEqual(decryptedText, malformedEncryptedText);
	});
});
