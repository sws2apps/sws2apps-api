import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidCongregationRoleList } from '../../../src/modules/congregation-administration/role-validation.js';

describe('congregation role input validation', () => {
	it('accepts non-empty arrays containing known roles', () => {
		assert.equal(isValidCongregationRoleList(['publisher']), true);
		assert.equal(isValidCongregationRoleList(['admin', 'secretary']), true);
	});

	it('rejects empty arrays and unknown roles', () => {
		assert.equal(isValidCongregationRoleList([]), false);
		assert.equal(isValidCongregationRoleList(['super_admin']), false);
	});

	it('rejects values that are not arrays of strings', () => {
		assert.equal(isValidCongregationRoleList('admin'), false);
		assert.equal(isValidCongregationRoleList(['admin', 1]), false);
	});
});
