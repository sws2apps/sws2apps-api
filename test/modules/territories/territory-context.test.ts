import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { resolveTerritoryActor } from '#modules/territories/services/territory.service.js';

const originalCongregations = CongregationsList.list;
afterEach(() => {
	CongregationsList.list = originalCongregations;
});

describe('territory authenticated identity', () => {
	it('rejects a privileged user accessing a different congregation', () => {
		const user = new User('user');
		user.profile.congregation = {
			id: 'own',
			cong_role: ['admin'],
			account_type: 'vip',
			user_local_uid: 'person',
		};
		assert.throws(() => resolveTerritoryActor(user, 'another'), /UNAUTHORIZED_ACCESS/);
	});

	it('requires a live congregation and enabled data sync', () => {
		const user = new User('user');
		user.profile.congregation = {
			id: 'own',
			cong_role: ['publisher'],
			account_type: 'vip',
			user_local_uid: 'person',
		};
		CongregationsList.list = [];
		assert.throws(() => resolveTerritoryActor(user, 'own'), /UNAUTHORIZED_ACCESS/);
		const congregation = new Congregation('own');
		congregation.members = [user];
		congregation.settings.data_sync.value = false;
		CongregationsList.list = [congregation];
		assert.throws(() => resolveTerritoryActor(user, 'own'), /UNAUTHORIZED_ACCESS/);
		congregation.settings.data_sync.value = true;
		assert.equal(resolveTerritoryActor(user, 'own').personId, 'person');
		congregation.members = [];
		assert.throws(() => resolveTerritoryActor(user, 'own'), /UNAUTHORIZED_ACCESS/);
	});
});
