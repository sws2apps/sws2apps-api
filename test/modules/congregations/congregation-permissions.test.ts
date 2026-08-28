import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canManageCongregationApplications } from '../../../src/modules/congregations/congregation-permissions.js';

describe('congregation application permissions', () => {
	it('allows congregation committee roles', () => {
		assert.equal(canManageCongregationApplications(['admin']), true);
		assert.equal(canManageCongregationApplications(['coordinator']), true);
		assert.equal(canManageCongregationApplications(['secretary']), true);
		assert.equal(canManageCongregationApplications(['service_overseer']), true);
	});

	it('denies unrelated congregation roles', () => {
		assert.equal(canManageCongregationApplications(['publisher']), false);
		assert.equal(canManageCongregationApplications(['view_schedules']), false);
	});
});
