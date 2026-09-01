import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasAnyCongregationRole } from '#http/security/roles.js';

describe('congregation role authorization', () => {
	it('allows a user with at least one required role', () => {
		assert.equal(hasAnyCongregationRole(['publisher', 'secretary'], ['admin', 'secretary']), true);
	});

	it('denies a user without a required role', () => {
		assert.equal(hasAnyCongregationRole(['publisher'], ['admin', 'secretary']), false);
	});

	it('denies a user without congregation roles', () => {
		assert.equal(hasAnyCongregationRole(undefined, ['admin']), false);
	});
});
