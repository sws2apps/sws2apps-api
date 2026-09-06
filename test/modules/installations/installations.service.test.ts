import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { InstallationsList } from '#modules/installations/installation-list.js';
import {
	prepareInstallationRegistration,
	registerInstallation,
} from '#modules/installations/installations.service.js';

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

describe('registerInstallation atomic registration', () => {
	beforeEach(() => {
		InstallationsList.replace({ linked: [], pending: [] });
	});

	afterEach(() => {
		InstallationsList.replace({ linked: [], pending: [] });
	});

	it('publishes linked, pending, and the flattened list only after persistence succeeds', async () => {
		const persisted: unknown[] = [];

		await registerInstallation('installation-1', undefined, {
			save: async (installations) => {
				persisted.push({ ...installations });
			},
		});

		assert.equal(InstallationsList.find('installation-1')?.status, 'pending');
		assert.equal(InstallationsList.list.length, 1);
		assert.deepEqual(persisted, [{
			linked: [],
			pending: [{ id: 'installation-1', registered: InstallationsList.pending[0].registered }],
		}]);
	});

	it('keeps the flattened list consistent across repeated registrations', async () => {
		await registerInstallation('installation-1', undefined, {
			save: async () => undefined,
		});
		await registerInstallation('installation-2', 'user-1', {
			save: async () => undefined,
		});
		await registerInstallation('installation-1', 'user-1', {
			save: async () => undefined,
		});

		assert.equal(InstallationsList.list.length, 2);
		assert.equal(InstallationsList.find('installation-1')?.status, 'linked');
		assert.equal(InstallationsList.find('installation-1')?.user, 'user-1');
		assert.equal(InstallationsList.find('installation-2')?.status, 'linked');
		assert.equal(InstallationsList.find('installation-2')?.user, 'user-1');
		assert.equal(InstallationsList.list.filter((item) => item.status === 'linked').length, 2);
		assert.equal(InstallationsList.list.filter((item) => item.status === 'pending').length, 0);
	});

	it('promotes a pending installation and updates the flattened list atomically', async () => {
		InstallationsList.replace({
			linked: [],
			pending: [{ id: 'installation-1', registered: '2026-08-01T00:00:00.000Z' }],
		});

		await registerInstallation('installation-1', 'user-1', {
			save: async () => undefined,
		});

		assert.equal(InstallationsList.pending.length, 0);
		assert.equal(InstallationsList.linked.length, 1);
		assert.equal(InstallationsList.linked[0].user, 'user-1');
		assert.equal(InstallationsList.list.length, 1);
		assert.equal(InstallationsList.find('installation-1')?.status, 'linked');
		assert.equal(InstallationsList.find('installation-1')?.user, 'user-1');
		assert.equal(InstallationsList.list.filter((item) => item.status === 'pending').length, 0);
		assert.equal(InstallationsList.list.filter((item) => item.status === 'linked').length, 1);
	});

	it('leaves linked, pending, and the flattened list untouched when persistence fails', async () => {
		InstallationsList.replace({
			linked: [],
			pending: [{ id: 'installation-1', registered: '2026-08-01T00:00:00.000Z' }],
		});
		const snapshotLinked = InstallationsList.linked;
		const snapshotPending = InstallationsList.pending;
		const snapshotList = InstallationsList.list;

		await assert.rejects(
			registerInstallation('installation-1', 'user-1', {
				save: async () => {
					throw new Error('Storage unavailable');
				},
			}),
			/Storage unavailable/,
		);

		assert.equal(InstallationsList.linked, snapshotLinked);
		assert.equal(InstallationsList.pending, snapshotPending);
		assert.equal(InstallationsList.list, snapshotList);
		assert.equal(InstallationsList.find('installation-1')?.status, 'pending');
		assert.equal(InstallationsList.find('installation-1')?.user, undefined);
	});

	it('rollout counts reflect only the persisted, published registrations', async () => {
		await registerInstallation('installation-1', undefined, {
			save: async () => undefined,
		});
		await registerInstallation('installation-2', 'user-1', {
			save: async () => undefined,
		});

		assert.equal(InstallationsList.list.length, 2);
		assert.equal(
			InstallationsList.list.filter((item) => item.status === 'pending').length,
			1,
		);
		assert.equal(
			InstallationsList.list.filter((item) => item.status === 'linked').length,
			1,
		);
	});
});
