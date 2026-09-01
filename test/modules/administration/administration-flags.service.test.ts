import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	AdministrationFlagError,
	buildAdministrationFlagList,
	createAdministrationFlag,
	deleteAdministrationFlag,
	toggleAdministrationFlag,
	toggleCongregationFlag,
	toggleUserFlag,
	updateAdministrationFlag,
} from '#modules/administration/services/administration-flags.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { Flag } from '#modules/feature-flags/flag.js';
import { Flags } from '#modules/feature-flags/index.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/index.js';

const createFlag = (id = 'flag-1') => new Flag({
	id,
	name: 'NEW_FEATURE',
	description: 'A new feature',
	availability: 'user',
	coverage: 25,
	status: false,
	installations: [],
});

describe('administration feature flag list', () => {
	it('includes users and congregations assigned to each flag', () => {
		const result = buildAdministrationFlagList(
			[
				{
					id: 'flag-1',
					name: 'NEW_FEATURE',
					description: 'A new feature',
					availability: 'user',
					coverage: 25,
					status: true,
				},
			],
			[
				{
					id: 'user-1',
					flags: ['flag-1'],
					profile: {
						firstname: { value: 'Jane' },
						lastname: { value: 'Doe' },
					},
				},
			],
			[
				{
					id: 'congregation-1',
					flags: ['flag-1'],
					settings: {
						country_code: 'MG',
						cong_name: 'Central',
					},
				},
			],
		);

		assert.deepEqual(result[0]?.users, [{ name: 'Doe Jane', id: 'user-1' }]);
		assert.deepEqual(result[0]?.congregations, [
			{ name: '(MG) Central', id: 'congregation-1' },
		]);
	});

	it('omits records that are not assigned to a flag', () => {
		const result = buildAdministrationFlagList(
			[
				{
					id: 'flag-1',
					name: 'NEW_FEATURE',
					description: 'A new feature',
					availability: 'app',
					coverage: 0,
					status: false,
				},
			],
			[],
			[],
		);

		assert.deepEqual(result[0]?.users, []);
		assert.deepEqual(result[0]?.congregations, []);
	});
});

describe('administration feature flag management', () => {
	let originalFlags: Flag[];
	let originalUsers: User[];
	let originalCongregations: Congregation[];

	beforeEach(() => {
		originalFlags = Flags.list;
		originalUsers = UsersList.list;
		originalCongregations = CongregationsList.list;
		Flags.list = [];
		UsersList.list = [];
		CongregationsList.list = [];
	});

	afterEach(() => {
		Flags.list = originalFlags;
		UsersList.list = originalUsers;
		CongregationsList.list = originalCongregations;
	});

	it('creates, updates, toggles, and deletes flags through the feature service', async () => {
		await createAdministrationFlag('new feature', 'Initial description', 'user', {
			createFlag: async (name, description, availability) => {
				assert.equal(name, 'new feature');
				Flags.list.push(new Flag({
					id: 'flag-1',
					name: name.toUpperCase(),
					description,
					availability,
					coverage: 0,
					status: false,
					installations: [],
				}));
			},
		});

		const flag = Flags.list[0]!;
		assert.equal(flag.name, 'NEW FEATURE');

		await updateAdministrationFlag(flag.id, 'RENAMED', 'Updated description', 50, {
			updateFlag: async (target, name, description, coverage) => {
				target.name = name;
				target.description = description;
				target.coverage = coverage;
			},
		});
		assert.equal(flag.name, 'RENAMED');
		assert.equal(flag.coverage, 50);

		await toggleAdministrationFlag(flag.id, {
			toggleFlag: async (target) => {
				target.status = !target.status;
			},
		});
		assert.equal(flag.status, true);

		const result = await deleteAdministrationFlag(flag.id, {
			deleteFlag: async (flagId) => {
				Flags.list = Flags.list.filter((currentFlag) => currentFlag.id !== flagId);
			},
		});
		assert.deepEqual(result, []);
	});

	it('toggles assignments and rejects missing assignment targets', async () => {
		const flag = createFlag();
		const user = new User('user-1');
		const congregation = new Congregation('congregation-1');
		Flags.list = [flag];
		UsersList.list = [user];
		CongregationsList.list = [congregation];

		await toggleUserFlag(user.id, flag.id, {
			saveUserFlags: async (target, flags) => {
				target.flags = flags;
			},
		});
		await toggleCongregationFlag(congregation.id, flag.id, {
			saveCongregationFlags: async (target, flags) => {
				target.flags = flags;
			},
		});

		assert.deepEqual(user.flags, [flag.id]);
		assert.deepEqual(congregation.flags, [flag.id]);
		await assert.rejects(
			toggleUserFlag('missing-user', flag.id),
			(error: unknown) =>
				error instanceof AdministrationFlagError && error.code === 'USER_NOT_FOUND',
		);
		await assert.rejects(
			toggleCongregationFlag(congregation.id, 'missing-flag'),
			(error: unknown) =>
				error instanceof AdministrationFlagError && error.code === 'FLAG_NOT_FOUND',
		);
	});
});
