import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { InstallationsList } from '#modules/installations/installation-list.js';
import type { AppInstallation } from '#modules/installations/installation.js';
import {
	prepareInstallationRegistration,
	registerInstallation,
	touchInstallation,
} from '#modules/installations/installations.service.js';

const registeredAt = '2026-08-30T10:00:00.000Z';

const createPersistentStore = () => {
	let store: AppInstallation = { linked: [], pending: [] };
	const persisted: AppInstallation[] = [];
	return {
		updateInstallations: async <T>(
			update: (current: AppInstallation) => Promise<{ next: AppInstallation; result: T }>,
		): Promise<T> => {
			const { next, result } = await update(store);
			store = next;
			persisted.push(store);
			return result;
		},
		setState: (state: AppInstallation) => {
			store = state;
		},
		getState: () => store,
		persisted,
	};
};

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
			last_handshake: registeredAt,
		}]);
		assert.deepEqual(result.linked, []);
		assert.equal(result.changed, true);
		assert.deepEqual(installations, { linked: [], pending: [] });
	});

	it('promotes a pending installation when a user becomes available', () => {
		const registration = { id: 'installation-1', last_handshake: 'before' };
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
			installations: [{ id: 'installation-1', last_handshake: registeredAt }],
		}]);
		assert.equal(result.changed, true);
	});

	it('leaves an existing linked installation unchanged', () => {
		const linkedRegistration = {
			user: 'user-1',
			installations: [{ id: 'installation-1', last_handshake: 'before' }],
		};
		const installations = { linked: [linkedRegistration], pending: [] };

		const result = prepareInstallationRegistration(
			installations,
			{
				id: 'installation-1',
				last_handshake: 'before',
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
		const store = createPersistentStore();

		await registerInstallation('installation-1', undefined, {
			updateInstallations: store.updateInstallations,
		});

		assert.equal(InstallationsList.find('installation-1')?.status, 'pending');
		assert.equal(InstallationsList.list.length, 1);
		assert.equal(store.persisted.length, 1);
		assert.equal(store.persisted[0].pending[0].id, 'installation-1');
	});

	it('keeps the flattened list consistent across repeated registrations', async () => {
		const store = createPersistentStore();

		await registerInstallation('installation-1', undefined, {
			updateInstallations: store.updateInstallations,
		});
		await registerInstallation('installation-2', 'user-1', {
			updateInstallations: store.updateInstallations,
		});
		await registerInstallation('installation-1', 'user-1', {
			updateInstallations: store.updateInstallations,
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
		const store = createPersistentStore();
		store.setState({
			linked: [],
			pending: [{ id: 'installation-1', last_handshake: '2026-08-01T00:00:00.000Z' }],
		});

		await registerInstallation('installation-1', 'user-1', {
			updateInstallations: store.updateInstallations,
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
			pending: [{ id: 'installation-1', last_handshake: '2026-08-01T00:00:00.000Z' }],
		});
		const snapshotLinked = InstallationsList.linked;
		const snapshotPending = InstallationsList.pending;
		const snapshotList = InstallationsList.list;

		await assert.rejects(
			registerInstallation('installation-1', 'user-1', {
				updateInstallations: async () => {
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
		const store = createPersistentStore();

		await registerInstallation('installation-1', undefined, {
			updateInstallations: store.updateInstallations,
		});
		await registerInstallation('installation-2', 'user-1', {
			updateInstallations: store.updateInstallations,
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

describe('installation handshake refresh', () => {
	beforeEach(() => {
		InstallationsList.replace({ linked: [], pending: [] });
	});

	afterEach(() => {
		InstallationsList.replace({ linked: [], pending: [] });
	});

	it('skips unknown installations without touching storage', async () => {
		const store = createPersistentStore();

		await touchInstallation('missing-installation', {
			updateInstallations: store.updateInstallations,
		});

		assert.equal(store.persisted.length, 0);
	});

	it('does not write when the last handshake is recent', async () => {
		const store = createPersistentStore();
		const state: AppInstallation = {
			linked: [
				{
					user: 'user-1',
					installations: [{ id: 'installation-1', last_handshake: '2026-09-01T00:00:00.000Z' }],
				},
			],
			pending: [],
		};
		InstallationsList.replace(state);
		store.setState(state);

		await touchInstallation('installation-1', {
			updateInstallations: store.updateInstallations,
		});

		assert.equal(store.persisted.length, 0);
	});

	it('refreshes a stale linked installation and publishes the cache', async () => {
		const store = createPersistentStore();
		const state: AppInstallation = {
			linked: [
				{
					user: 'user-1',
					installations: [{ id: 'installation-1', last_handshake: '2026-01-01T00:00:00.000Z' }],
				},
			],
			pending: [],
		};
		InstallationsList.replace(state);
		store.setState(state);

		await touchInstallation('installation-1', {
			updateInstallations: store.updateInstallations,
		});

		assert.equal(store.persisted.length, 1);
		const refreshed = store.getState().linked[0]?.installations[0];
		assert.equal(refreshed?.id, 'installation-1');
		assert.notEqual(refreshed?.last_handshake, '2026-01-01T00:00:00.000Z');
		assert.equal(
			InstallationsList.find('installation-1')?.last_handshake,
			refreshed?.last_handshake,
		);
	});

	it('refreshes a stale pending installation', async () => {
		const store = createPersistentStore();
		const state: AppInstallation = {
			linked: [],
			pending: [{ id: 'installation-1', last_handshake: '2026-01-01T00:00:00.000Z' }],
		};
		InstallationsList.replace(state);
		store.setState(state);

		await touchInstallation('installation-1', {
			updateInstallations: store.updateInstallations,
		});

		const refreshed = store.getState().pending[0];
		assert.equal(refreshed?.id, 'installation-1');
		assert.notEqual(refreshed?.last_handshake, '2026-01-01T00:00:00.000Z');
		assert.equal(InstallationsList.find('installation-1')?.status, 'pending');
	});

	it('keeps the cache unchanged when the refresh write fails', async () => {
		InstallationsList.replace({
			linked: [
				{
					user: 'user-1',
					installations: [{ id: 'installation-1', last_handshake: '2026-01-01T00:00:00.000Z' }],
				},
			],
			pending: [],
		});

		await touchInstallation('installation-1', {
			updateInstallations: async () => {
				throw new Error('Storage unavailable');
			},
		});

		assert.equal(
			InstallationsList.find('installation-1')?.last_handshake,
			'2026-01-01T00:00:00.000Z',
		);
	});
});
