import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatAdministrationSession } from '../../../src/modules/administration/administration-users.service.js';
import { UserSession } from '../../../src/v3/definition/user.js';

const session: UserSession = {
	identifier: 'session-1',
	visitorid: 'private-visitor-id',
	last_seen: '2026-08-28T10:00:00.000Z',
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
};

describe('administration user sessions', () => {
	it('marks the administrator current session without exposing its visitor ID', () => {
		const result = formatAdministrationSession(session, 'private-visitor-id');

		assert.equal(result.isSelf, true);
		assert.equal('visitorid' in result, false);
		assert.deepEqual(result.device, {
			browserName: 'Firefox',
			os: 'Windows',
			isMobile: false,
		});
	});

	it('does not mark another session as the current session', () => {
		const result = formatAdministrationSession(session, 'different-visitor-id');

		assert.equal(result.isSelf, false);
	});
});
