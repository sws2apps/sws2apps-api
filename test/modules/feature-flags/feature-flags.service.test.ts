import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	createFeatureFlag,
	registerFeatureFlagInstallation,
	toggleFeatureFlag,
	touchFeatureFlagInstallation,
	updateFeatureFlag,
} from '#modules/feature-flags/feature-flags.service.js';
import { Flag } from '#modules/feature-flags/flag.js';
import { Flags } from '#modules/feature-flags/flags.js';

const createFlag = () => new Flag({
	id: 'flag-1',
	name: 'NEW_FEATURE',
	description: 'Initial description',
	availability: 'app',
	coverage: 0,
	status: false,
	installations: [],
});

describe('feature flag persistence', () => {
	let originalFlags: Flag[];

	beforeEach(() => {
		originalFlags = Flags.list;
		Flags.list = [];
	});

	afterEach(() => {
		Flags.list = originalFlags;
	});

	const createStore = () => {
		let store: Flag[] = [];
		return {
			updateFeatureFlags: async <T>(
				update: (current: Flag[]) => Promise<{ next: Flag[]; result: T }>,
			): Promise<T> => {
				const { next, result } = await update(store);
				store = next;
				return result;
			},
			setState: (flags: Flag[]) => {
				store = flags;
			},
			getState: () => store,
		};
	};

	it('publishes a new flag only after it has been persisted', async () => {
		const store = createStore();

		await createFeatureFlag('new feature', 'Description', 'app', {
			createId: () => 'flag-1',
			updateFeatureFlags: store.updateFeatureFlags,
		});

		assert.equal(Flags.list[0]?.id, 'flag-1');
		assert.equal(Flags.list[0]?.name, 'NEW FEATURE');
		assert.equal(store.getState()[0]?.name, 'NEW FEATURE');
	});

	it('does not publish a new flag when persistence fails', async () => {
		await assert.rejects(
			createFeatureFlag('new feature', 'Description', 'app', {
				createId: () => 'flag-1',
				updateFeatureFlags: async () => {
					throw new Error('storage unavailable');
				},
			}),
			/storage unavailable/,
		);

		assert.deepEqual(Flags.list, []);
	});

	it('updates the cached flag only after persistence succeeds', async () => {
		const flag = createFlag();
		const store = createStore();
		store.setState([flag]);

		await updateFeatureFlag(flag, 'RENAMED', 'Updated description', 75, {
			updateFeatureFlags: store.updateFeatureFlags,
		});

		assert.equal(flag.name, 'RENAMED');
		assert.equal(flag.description, 'Updated description');
		assert.equal(flag.coverage, 75);
		assert.equal(store.getState()[0]?.name, 'RENAMED');
		assert.equal(store.getState()[0]?.coverage, 75);
	});

	it('keeps update, toggle, and installation state unchanged after write failures', async () => {
		const flag = createFlag();
		Flags.list = [flag];
		const failingWrite = async () => {
			throw new Error('storage unavailable');
		};

		await assert.rejects(
			updateFeatureFlag(flag, 'RENAMED', 'Updated description', 75, {
				updateFeatureFlags: failingWrite,
			}),
			/storage unavailable/,
		);
		await assert.rejects(
			toggleFeatureFlag(flag, { updateFeatureFlags: failingWrite }),
			/storage unavailable/,
		);
		await assert.rejects(
			registerFeatureFlagInstallation(
				flag,
				{ id: 'installation-1', last_handshake: '2026-09-05T00:00:00.000Z' },
				{ updateFeatureFlags: failingWrite },
			),
			/storage unavailable/,
		);

		assert.equal(flag.name, 'NEW_FEATURE');
		assert.equal(flag.description, 'Initial description');
		assert.equal(flag.coverage, 0);
		assert.equal(flag.status, false);
		assert.deepEqual(flag.installations, []);
	});

	it('publishes toggles and installation registrations after successful writes', async () => {
		const flag = createFlag();
		const store = createStore();
		store.setState([flag]);

		await toggleFeatureFlag(flag, {
			updateFeatureFlags: store.updateFeatureFlags,
		});
		await registerFeatureFlagInstallation(
			flag,
			{ id: 'installation-1', last_handshake: '2026-09-05T00:00:00.000Z' },
			{
				updateFeatureFlags: store.updateFeatureFlags,
			},
		);

		assert.equal(flag.status, true);
		assert.equal(flag.installations[0]?.id, 'installation-1');
		assert.equal(store.getState()[0]?.status, true);
		assert.equal(store.getState()[0]?.installations[0]?.id, 'installation-1');
	});

	it('merges concurrent registrations instead of losing the earlier assignment', async () => {
		const flag = createFlag();
		const store = createStore();
		store.setState([flag]);
		const queued: Array<() => Promise<void>> = [];
		const sequentialStore = {
			updateFeatureFlags: async <T>(
				update: (current: Flag[]) => Promise<{ next: Flag[]; result: T }>,
			): Promise<T> => {
				let resolve!: (value: T) => void;
				const pending = new Promise<T>((done) => (resolve = done));
				queued.push(async () => {
					const { next, result } = await update(store.getState());
					store.setState(next);
					resolve(result);
				});
				return pending;
			},
		};

		const first = registerFeatureFlagInstallation(
			flag,
			{ id: 'installation-1', last_handshake: '2026-09-05T00:00:00.000Z' },
			{ updateFeatureFlags: sequentialStore.updateFeatureFlags },
		);
		const second = registerFeatureFlagInstallation(
			flag,
			{ id: 'installation-2', last_handshake: '2026-09-05T00:00:00.000Z' },
			{ updateFeatureFlags: sequentialStore.updateFeatureFlags },
		);

		assert.equal(queued.length, 2);

		for (const run of queued) await run();
		await Promise.all([first, second]);

		const storedIds = store.getState()[0]?.installations.map((record) => record.id);
		assert.deepEqual(storedIds, ['installation-1', 'installation-2']);
	});

	it('refreshes a stale flag installation handshake and publishes the cache', async () => {
		const flag = createFlag();
		flag.installations = [{ id: 'installation-1', last_handshake: '2026-01-01T00:00:00.000Z' }];
		const store = createStore();
		store.setState([flag]);
		Flags.list = [flag];

		await touchFeatureFlagInstallation(flag, 'installation-1', {
			updateFeatureFlags: store.updateFeatureFlags,
		});

		const refreshed = Flags.list[0]?.installations[0];
		assert.equal(refreshed?.id, 'installation-1');
		assert.notEqual(refreshed?.last_handshake, '2026-01-01T00:00:00.000Z');
	});

	it('does not write when the flag installation handshake is recent', async () => {
		const flag = createFlag();
		flag.installations = [{ id: 'installation-1', last_handshake: '2026-09-05T00:00:00.000Z' }];
		const store = createStore();
		store.setState([flag]);
		Flags.list = [flag];
		let writes = 0;
		const { updateFeatureFlags } = store;
		store.updateFeatureFlags = async <T>(
			update: (current: Flag[]) => Promise<{ next: Flag[]; result: T }>,
		): Promise<T> => {
			writes += 1;
			return updateFeatureFlags(update);
		};

		await touchFeatureFlagInstallation(flag, 'installation-1', {
			updateFeatureFlags: store.updateFeatureFlags,
		});

		assert.equal(writes, 0);
	});

	it('does not rethrow a failed refresh of a flag installation handshake', async () => {
		const flag = createFlag();
		flag.installations = [{ id: 'installation-1', last_handshake: '2026-01-01T00:00:00.000Z' }];
		Flags.list = [flag];

		await touchFeatureFlagInstallation(flag, 'installation-1', {
			updateFeatureFlags: async () => {
				throw new Error('storage unavailable');
			},
		});

		assert.equal(
			Flags.list[0]?.installations[0]?.last_handshake,
			'2026-01-01T00:00:00.000Z',
		);
	});
});
