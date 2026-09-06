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
				const result = await getPublicFeatureFlags(installation.id, undefined, {
					registerInstallation: async (id, userId) => {
						assert.equal(id, installation.id);
						assert.equal(userId, availability === 'app' ? undefined : user.id);
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
