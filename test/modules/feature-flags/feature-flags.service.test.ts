import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	createFeatureFlag,
	registerFeatureFlagInstallation,
	toggleFeatureFlag,
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

	it('publishes a new flag only after it has been persisted', async () => {
		await createFeatureFlag('new feature', 'Description', 'app', {
			createId: () => 'flag-1',
			saveFlags: async (flags) => {
				assert.deepEqual(Flags.list, []);
				assert.equal(flags[0]?.id, 'flag-1');
				assert.equal(flags[0]?.name, 'NEW FEATURE');
			},
		});

		assert.equal(Flags.list[0]?.id, 'flag-1');
	});

	it('does not publish a new flag when persistence fails', async () => {
		await assert.rejects(
			createFeatureFlag('new feature', 'Description', 'app', {
				createId: () => 'flag-1',
				saveFlags: async () => {
					throw new Error('storage unavailable');
				},
			}),
			/storage unavailable/,
		);

		assert.deepEqual(Flags.list, []);
	});

	it('updates the cached flag only after persistence succeeds', async () => {
		const flag = createFlag();
		Flags.list = [flag];

		await updateFeatureFlag(flag, 'RENAMED', 'Updated description', 75, {
			saveFlags: async (flags) => {
				assert.equal(flag.name, 'NEW_FEATURE');
				assert.equal(flag.coverage, 0);
				assert.equal(flags[0]?.name, 'RENAMED');
				assert.equal(flags[0]?.coverage, 75);
			},
		});

		assert.equal(flag.name, 'RENAMED');
		assert.equal(flag.description, 'Updated description');
		assert.equal(flag.coverage, 75);
	});

	it('keeps update, toggle, and installation state unchanged after write failures', async () => {
		const flag = createFlag();
		Flags.list = [flag];
		const failingWrite = async () => {
			throw new Error('storage unavailable');
		};

		await assert.rejects(
			updateFeatureFlag(flag, 'RENAMED', 'Updated description', 75, {
				saveFlags: failingWrite,
			}),
			/storage unavailable/,
		);
		await assert.rejects(
			toggleFeatureFlag(flag, { saveFlags: failingWrite }),
			/storage unavailable/,
		);
		await assert.rejects(
			registerFeatureFlagInstallation(
				flag,
				{ id: 'installation-1', registered: '2026-09-05T00:00:00.000Z' },
				{ saveFlags: failingWrite },
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
		Flags.list = [flag];

		await toggleFeatureFlag(flag, {
			saveFlags: async (flags) => {
				assert.equal(flag.status, false);
				assert.equal(flags[0]?.status, true);
			},
		});
		await registerFeatureFlagInstallation(
			flag,
			{ id: 'installation-1', registered: '2026-09-05T00:00:00.000Z' },
			{
				saveFlags: async (flags) => {
					assert.deepEqual(flag.installations, []);
					assert.equal(flags[0]?.installations[0]?.id, 'installation-1');
				},
			},
		);

		assert.equal(flag.status, true);
		assert.equal(flag.installations[0]?.id, 'installation-1');
	});
});
