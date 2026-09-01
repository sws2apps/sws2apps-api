import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	assignFeatureFlag,
	removeFeatureFlagAssignment,
	toggleFeatureFlagAssignment,
} from '#modules/feature-flags/feature-flag-assignments.service.js';

describe('feature flag assignments', () => {
	it('adds and removes a toggled flag without mutating current assignments', () => {
		const currentFlags = ['flag-1'];

		const addedFlags = toggleFeatureFlagAssignment(currentFlags, 'flag-2');
		const removedFlags = toggleFeatureFlagAssignment(currentFlags, 'flag-1');

		assert.deepEqual(addedFlags, ['flag-1', 'flag-2']);
		assert.deepEqual(removedFlags, []);
		assert.deepEqual(currentFlags, ['flag-1']);
	});

	it('does not create duplicate assignments', () => {
		const currentFlags = ['flag-1'];

		const assignedFlags = assignFeatureFlag(currentFlags, 'flag-1');

		assert.deepEqual(assignedFlags, ['flag-1']);
		assert.notEqual(assignedFlags, currentFlags);
	});

	it('removes every stale occurrence of a flag', () => {
		const assignedFlags = ['flag-1', 'flag-2', 'flag-1'];

		const remainingFlags = removeFeatureFlagAssignment(
			assignedFlags,
			'flag-1',
		);

		assert.deepEqual(remainingFlags, ['flag-2']);
	});
});
