import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';

import { getRequestLogPath } from '../../src/http/request-log-path.js';

describe('request log paths', () => {
	it('logs the route pattern without concrete resource identifiers', () => {
		const request = {
			path: '/users/private-user-id/sessions',
			route: { path: '/users/:id/sessions' },
		} as Request;

		assert.equal(getRequestLogPath(request), '/users/:id/sessions');
	});

	it('does not log attacker-controlled unmatched paths', () => {
		const request = {
			path: '/private-value-supplied-by-a-client',
		} as Request;

		assert.equal(getRequestLogPath(request), 'unmatched');
	});
});
