import { Congregation } from '#modules/congregations/congregation.js';
import { User } from '#modules/users/user.js';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import { resolvePartnerContext } from '#modules/preaching-partner/partner.service.js';

const originalUsers = UsersList.list;
const originalCongregations = CongregationsList.list;
afterEach(() => { UsersList.list = originalUsers; CongregationsList.list = originalCongregations; });

test('membership, linked identity and congregation data-sync opt-in are required', () => {
	const congregation = new Congregation('cong');
	const user = new User('user');
	UsersList.list = [user]; CongregationsList.list = [congregation];
	assert.throws(() => resolvePartnerContext('user', 'cong'), /PARTNER_FORBIDDEN/);
	user.profile.congregation = { id: 'cong', account_type: 'pocket', cong_role: ['publisher'], user_local_uid: 'person' };
	assert.throws(() => resolvePartnerContext('user', 'cong'), /PARTNER_FORBIDDEN/);
	congregation.settings.data_sync.value = true;
	congregation.settings.cong_access_code = 'sealed-access-code';
	assert.deepEqual(resolvePartnerContext('user', 'cong'), { actor: 'person', congregationId: 'cong', accessCode: 'sealed-access-code' });
	assert.throws(() => resolvePartnerContext('user', 'other'), /PARTNER_FORBIDDEN/);
	assert.throws(() => resolvePartnerContext('missing', 'cong'), /PARTNER_FORBIDDEN/);
	delete user.profile.congregation.user_local_uid;
	assert.throws(() => resolvePartnerContext('user', 'cong'), /PARTNER_FORBIDDEN/);
});
