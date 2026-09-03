import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildUserAuthenticationResponse } from '#modules/auth/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { User } from '#modules/users/user.js';

const createUser = () => {
	const user = new User('user-1');
	user.profile.role = 'vip';
	user.profile.firstname = { value: 'Jane', updatedAt: '2026-01-01' };
	user.profile.lastname = { value: 'Doe', updatedAt: '2026-01-01' };

	return user;
};

const createCongregation = () => {
	const congregation = new Congregation('congregation-1');
	congregation.settings.cong_name = 'Central';
	congregation.settings.cong_prefix = 'ABC';
	congregation.settings.country_code = 'MDG';
	congregation.settings.cong_access_code = 'encrypted-access-code';
	congregation.settings.cong_master_key = 'encrypted-master-key';

	const [midweekMeeting] = congregation.settings.midweek_meeting;
	const [weekendMeeting] = congregation.settings.weekend_meeting;
	assert.ok(midweekMeeting);
	assert.ok(weekendMeeting);

	midweekMeeting.time.value = '18:30';
	midweekMeeting.weekday.value = 2;
	weekendMeeting.time.value = '09:00';
	weekendMeeting.weekday.value = 6;

	return congregation;
};

describe('authentication response projection', () => {
	it('returns only user settings when the user has no congregation', () => {
		const user = createUser();

		const result = buildUserAuthenticationResponse({
			authUser: user,
			mfaStatus: 'enabled',
		});

		assert.deepEqual(result, {
			message: 'TOKEN_VALID',
			id: user.id,
			app_settings: {
				user_settings: {
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					role: 'vip',
					mfa: 'enabled',
				},
			},
		});
	});

	it('does not project stale membership when the congregation is missing', () => {
		const user = createUser();
		user.profile.congregation = {
			id: 'missing-congregation',
			account_type: 'vip',
			cong_role: ['publisher'],
			user_local_uid: 'person-1',
		};

		const result = buildUserAuthenticationResponse(
			{ authUser: user },
			{ findCongregationById: () => undefined },
		);

		assert.equal(result.app_settings.cong_settings, undefined);
		assert.equal(result.app_settings.user_settings.user_local_uid, undefined);
		assert.equal(result.app_settings.user_settings.cong_role, undefined);
	});

	it('omits the congregation master key for an ordinary publisher', () => {
		const user = createUser();
		const congregation = createCongregation();
		user.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: ['publisher'],
			user_local_uid: 'person-1',
			user_members_delegate: ['person-2'],
		};

		const result = buildUserAuthenticationResponse(
			{ authUser: user },
			{ findCongregationById: () => congregation },
		);

		assert.equal(result.app_settings.cong_settings?.cong_name, 'Central');
		assert.equal(result.app_settings.cong_settings?.cong_access_code, 'encrypted-access-code');
		assert.equal(result.app_settings.cong_settings?.cong_master_key, undefined);
		assert.deepEqual(result.app_settings.user_settings.cong_role, ['publisher']);
		assert.deepEqual(result.app_settings.user_settings.user_members_delegate, ['person-2']);
		assert.deepEqual(result.app_settings.cong_settings?.midweek_meeting, [
			{
				type: 'main',
				time: { value: '18:30', updatedAt: '' },
				weekday: { value: 2, updatedAt: '' },
			},
		]);
	});

	it('includes the congregation master key for an authorized schedule role', () => {
		const user = createUser();
		const congregation = createCongregation();
		user.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: ['publisher', 'midweek_schedule'],
		};

		const result = buildUserAuthenticationResponse(
			{ authUser: user },
			{ findCongregationById: () => congregation },
		);

		assert.equal(
			result.app_settings.cong_settings?.cong_master_key,
			'encrypted-master-key',
		);
	});
});
