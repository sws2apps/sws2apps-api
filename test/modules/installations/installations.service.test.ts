import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepareInstallationRegistration } from '../../../src/modules/installations/installations.service.js';

const registeredAt = '2026-08-30T10:00:00.000Z';

describe('installation registration', () => {
	it('creates a pending registration for an anonymous installation', () => {
		const installations = { linked: [], pending: [] };

		const result = prepareInstallationRegistration(
			installations,
			undefined,
			'installation-1',
			undefined,
			registeredAt,
		);

		assert.deepEqual(result.pending, [{
			id: 'installation-1',
			registered: registeredAt,
		}]);
		assert.deepEqual(result.linked, []);
		assert.equal(result.changed, true);
		assert.deepEqual(installations, { linked: [], pending: [] });
	});

	it('promotes a pending installation when a user becomes available', () => {
		const registration = { id: 'installation-1', registered: 'before' };
		const installations = { linked: [], pending: [registration] };

		const result = prepareInstallationRegistration(
			installations,
			{ ...registration, status: 'pending' },
			'installation-1',
			'user-1',
			registeredAt,
		);

		assert.deepEqual(result.pending, []);
		assert.deepEqual(result.linked, [{
			user: 'user-1',
			installations: [{ id: 'installation-1', registered: registeredAt }],
		}]);
		assert.equal(result.changed, true);
	});

	it('leaves an existing linked installation unchanged', () => {
		const linkedRegistration = {
			user: 'user-1',
			installations: [{ id: 'installation-1', registered: 'before' }],
		};
		const installations = { linked: [linkedRegistration], pending: [] };

		const result = prepareInstallationRegistration(
			installations,
			{
				id: 'installation-1',
				registered: 'before',
				status: 'linked',
				user: 'user-1',
			},
			'installation-1',
			'user-1',
			registeredAt,
		);

		assert.equal(result.changed, false);
		assert.deepEqual(result.linked, [linkedRegistration]);
	});
});
