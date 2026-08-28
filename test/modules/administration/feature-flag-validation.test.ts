import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidFeatureFlagAvailability } from '../../../src/modules/administration/feature-flag-validation.js';

describe('feature flag availability validation', () => {
	it('accepts every supported target type', () => {
		assert.equal(isValidFeatureFlagAvailability('app'), true);
		assert.equal(isValidFeatureFlagAvailability('user'), true);
		assert.equal(isValidFeatureFlagAvailability('congregation'), true);
	});

	it('rejects unsupported and non-string target values', () => {
		assert.equal(isValidFeatureFlagAvailability('all'), false);
		assert.equal(isValidFeatureFlagAvailability(undefined), false);
	});
});
