import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTokenWithinAllowedWindow } from '../../../src/modules/mfa/token-validation.js';

describe('MFA token time window', () => {
	it('accepts the current and adjacent time steps', () => {
		assert.equal(isTokenWithinAllowedWindow(-1), true);
		assert.equal(isTokenWithinAllowedWindow(0), true);
		assert.equal(isTokenWithinAllowedWindow(1), true);
	});

	it('rejects missing or out-of-window tokens', () => {
		assert.equal(isTokenWithinAllowedWindow(null), false);
		assert.equal(isTokenWithinAllowedWindow(-2), false);
		assert.equal(isTokenWithinAllowedWindow(2), false);
	});
});
