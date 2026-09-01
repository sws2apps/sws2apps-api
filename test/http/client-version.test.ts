import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isClientVersionSupported } from '#http/client-version.js';

describe('client version compatibility', () => {
	it('accepts a client at the minimum version', () => {
		assert.equal(isClientVersionSupported('3.50.0', '3.50.0'), true);
	});

	it('accepts newer versions and versions with equivalent trailing zeroes', () => {
		assert.equal(isClientVersionSupported('3.51.0', '3.50.0'), true);
		assert.equal(isClientVersionSupported('3.50', '3.50.0'), true);
	});

	it('rejects a client below the minimum version', () => {
		assert.equal(isClientVersionSupported('3.49.9', '3.50.0'), false);
	});

	it('rejects malformed versions instead of treating them as current', () => {
		assert.equal(isClientVersionSupported('latest', '3.50.0'), false);
		assert.equal(isClientVersionSupported('3.50.0', ''), false);
	});
});
