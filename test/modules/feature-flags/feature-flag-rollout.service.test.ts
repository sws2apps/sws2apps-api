import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { getPublicFeatureFlags } from '#modules/feature-flags/feature-flag-rollout.service.js';
import { Flag } from '#modules/feature-flags/flag.js';
import { Flags } from '#modules/feature-flags/flags.js';
import { InstallationsList } from '#modules/installations/installation-list.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('public feature flag rollout identity resolution', () => {
	let originalFlags: typeof Flags.list;
	let originalInstallations: typeof InstallationsList.list;
	let originalUsers: typeof UsersList.list;
	let originalCongregations: typeof CongregationsList.list;

	beforeEach(() => {
		originalFlags = Flags.list;
		originalInstallations = InstallationsList.list;
		originalUsers = UsersList.list;
		originalCongregations = CongregationsList.list;
	});

	afterEach(() => {
		Flags.list = originalFlags;
		InstallationsList.list = originalInstallations;
		UsersList.list = originalUsers;
		CongregationsList.list = originalCongregations;
	});

	it('serves app-scoped flags only for an unbound installation', async () => {
		const user = new User('user-1');
		user.profile.role = 'vip';
		const congregation = new Congregation('congregation-1');
		user.profile.congregation = { id: congregation.id, account_type: 'vip', cong_role: [] };
		const appFlag = new Flag({ id: 'app-flag', name: 'APP_FEATURE', description: '', availability: 'app', status: true, coverage: 100, installations: [] });
		const userFlag = new Flag({ id: 'user-flag', name: 'USER_FEATURE', description: '', availability: 'user', status: true, coverage: 100, installations: [] });
		const congregationFlag = new Flag({ id: 'cong-flag', name: 'CONG_FEATURE', description: '', availability: 'congregation', status: true, coverage: 100, installations: [] });
		InstallationsList.list = [{ id: 'anonymous-installation', registered: '2026-01-01T00:00:00.000Z', status: 'pending' }];
		UsersList.list = [user];
		CongregationsList.list = [congregation];
		Flags.list = [appFlag, userFlag, congregationFlag];

		let registeredUserId: string | undefined = 'sentinel';
		const result = await getPublicFeatureFlags('anonymous-installation', {
			registerInstallation: async (_id, userId) => {
				registeredUserId = userId;
			},
			saveUserFeatureFlags: async () => {
				assert.fail('must not assign user flags to an anonymous installation');
			},
			saveCongregationFeatureFlags: async () => {
				assert.fail('must not assign congregation flags to an anonymous installation');
			},
			registerFeatureFlagInstallation: async () => {
				assert.fail('must not register feature installation for an anonymous app-flag request');
			},
		});

		assert.deepEqual(result, { APP_FEATURE: true });
		assert.equal(registeredUserId, undefined);
	});

	it('resolves user and congregation flags from the installation binding, not a caller-supplied identity', async () => {
		const boundUser = new User('bound-user');
		boundUser.profile.role = 'vip';
		const otherUser = new User('other-user');
		otherUser.profile.role = 'vip';
		const congregation = new Congregation('congregation-1');
		boundUser.profile.congregation = { id: congregation.id, account_type: 'vip', cong_role: [] };
		const userFlag = new Flag({ id: 'user-flag', name: 'USER_FEATURE', description: '', availability: 'user', status: true, coverage: 100, installations: [] });
		const congregationFlag = new Flag({ id: 'cong-flag', name: 'CONG_FEATURE', description: '', availability: 'congregation', status: true, coverage: 100, installations: [] });
		InstallationsList.list = [{ id: 'bound-installation', user: boundUser.id, registered: '2026-01-01T00:00:00.000Z', status: 'linked' }];
		UsersList.list = [boundUser, otherUser];
		CongregationsList.list = [congregation];
		Flags.list = [userFlag, congregationFlag];

		let registeredUserId: string | undefined;
		const result = await getPublicFeatureFlags('bound-installation', {
			registerInstallation: async (_id, userId) => {
				registeredUserId = userId;
			},
			registerFeatureFlagInstallation: async () => undefined,
			saveUserFeatureFlags: async (savedUser) => {
				assert.equal(savedUser, boundUser);
			},
			saveCongregationFeatureFlags: async (savedCongregation) => {
				assert.equal(savedCongregation, congregation);
			},
		});

		assert.deepEqual(result, { USER_FEATURE: true, CONG_FEATURE: true });
		assert.equal(registeredUserId, boundUser.id);
	});
});

describe('public feature flag rollout', () => {
	let originalFlags: typeof Flags.list;
	let originalInstallations: typeof InstallationsList.list;
	let originalUsers: typeof UsersList.list;
	let originalCongregations: typeof CongregationsList.list;

	beforeEach(() => {
		originalFlags = Flags.list;
		originalInstallations = InstallationsList.list;
		originalUsers = UsersList.list;
		originalCongregations = CongregationsList.list;
	});

	afterEach(() => {
		Flags.list = originalFlags;
		InstallationsList.list = originalInstallations;
		UsersList.list = originalUsers;
		CongregationsList.list = originalCongregations;
	});

	for (const availability of ['app', 'user', 'congregation'] as const) {
		for (const scenario of [
			{ name: 'zero coverage', coverage: 0, assigned: false, atThreshold: false, enabled: false, saves: 0 },
			{ name: 'full coverage', coverage: 100, assigned: false, atThreshold: false, enabled: true, saves: 1 },
			{ name: 'below partial coverage', coverage: 50, assigned: false, atThreshold: false, enabled: true, saves: 1 },
			{ name: 'at partial coverage', coverage: 50, assigned: false, atThreshold: true, enabled: false, saves: 0 },
			{ name: 'existing assignment', coverage: 50, assigned: true, atThreshold: false, enabled: true, saves: 0 },
		]) {
			it(`${availability}: ${scenario.name}`, async () => {
				const user = new User('user-1');
				const otherUser = new User('user-2');
				user.profile.role = 'vip';
				otherUser.profile.role = 'vip';
				const congregation = new Congregation('congregation-1');
				const otherCongregation = new Congregation('congregation-2');
				user.profile.congregation = { id: congregation.id, account_type: 'vip', cong_role: [] };
				const flag = new Flag({ id: 'flag-1', name: 'FEATURE', description: '', availability, status: true, coverage: scenario.coverage, installations: [] });
				const installation = { id: 'installation-1', user: user.id, registered: '2026-01-01T00:00:00.000Z', status: 'pending' as const };
				InstallationsList.list = [installation, { ...installation, id: 'installation-2' }];
				UsersList.list = [user, otherUser];
				CongregationsList.list = [congregation, otherCongregation];
				Flags.list = [flag, new Flag({ id: 'inactive', name: 'INACTIVE', description: '', availability, status: false, coverage: 100, installations: [] })];
				if (scenario.assigned) {
					user.flags = [flag.id];
					congregation.flags = [flag.id];
					flag.installations = [installation];
				}
				if (scenario.atThreshold) {
					otherUser.flags = [flag.id];
					otherCongregation.flags = [flag.id];
					flag.installations = [{ ...installation, id: 'installation-2' }];
				}
				const calls: string[] = [];
				const result = await getPublicFeatureFlags(installation.id, {
					registerInstallation: async (id, userId) => {
						assert.equal(id, installation.id);
						assert.equal(userId, user.id);
						calls.push('installation');
					},
					registerFeatureFlagInstallation: async (savedFlag, record) => {
						assert.equal(savedFlag, flag);
						assert.equal(record.id, installation.id);
						calls.push('app');
					},
					saveUserFeatureFlags: async (savedUser, assignedFlags) => {
						assert.equal(savedUser, user);
						assert.deepEqual(assignedFlags, [flag.id]);
						calls.push('user');
					},
					saveCongregationFeatureFlags: async (savedCongregation, assignedFlags) => {
						assert.equal(savedCongregation, congregation);
						assert.deepEqual(assignedFlags, [flag.id]);
						calls.push('congregation');
					},
				});
				assert.deepEqual(result, scenario.enabled ? { FEATURE: true } : {});
				const saves = availability === 'app' && scenario.coverage === 100 ? 0 : scenario.saves;
				assert.deepEqual(calls, [...Array<string>(saves).fill(availability), 'installation']);
			});
		}
	}
});
