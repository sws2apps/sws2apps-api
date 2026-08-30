import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UserSession } from '../../../src/modules/users/user.types.js';
import { projectUserSessions } from '../../../src/modules/users/users-account.service.js';

describe('user account sessions', () => {
	it('projects session details without exposing the visitor identifier', () => {
		const sessions = [{
			identifier: 'session-1',
			visitorid: 'private-visitor-id',
			last_seen: '2026-08-30T10:00:00.000Z',
			visitor_details: {
				browser: 'Firefox',
				os: 'Windows',
				ip: '192.0.2.1',
				ipLocation: {
					continent_code: 'AF',
					country_name: 'Madagascar',
					country_code: 'MDG',
					city: 'Antananarivo',
					timezone: 'Indian/Antananarivo',
				},
				isMobile: false,
			},
		}] satisfies UserSession[];

		const result = projectUserSessions(sessions, 'private-visitor-id');

		assert.equal(result[0].identifier, 'session-1');
		assert.equal(result[0].isSelf, true);
		assert.equal(result[0].country_name, 'Madagascar');
		assert.equal('visitorid' in result[0], false);
		assert.deepEqual(result[0].device, {
			browserName: 'Firefox',
			os: 'Windows',
			isMobile: false,
		});
	});
});
