import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';

describe('congregation master-key access', () => {
	it('allows roles responsible for congregation administration or schedules', () => {
		assert.equal(canAccessCongregationMasterKey(['coordinator']), true);
		assert.equal(canAccessCongregationMasterKey(['publisher', 'midweek_schedule']), true);
	});

	it('denies roles that do not require the master key', () => {
		assert.equal(canAccessCongregationMasterKey(['publisher']), false);
		assert.equal(canAccessCongregationMasterKey([]), false);
	});
});
