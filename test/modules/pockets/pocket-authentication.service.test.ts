import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	authenticatePocketInvitation,
	PocketAuthenticationError,
	validatePocketSession,
} from '#modules/pockets/pocket-authentication.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import { encryptData } from '#platform/encryption/encryption.js';

describe('Pocket authentication service', () => {
	let originalUsers: User[];
	let originalCongregations: Congregation[];

	beforeEach(() => {
		originalUsers = UsersList.list;
		originalCongregations = CongregationsList.list;
		UsersList.list = [];
		CongregationsList.list = [];
	});

	afterEach(() => {
		UsersList.list = originalUsers;
		CongregationsList.list = originalCongregations;
	});

	it('rejects a malformed invitation before creating a session', async () => {
		await assert.rejects(
			authenticatePocketInvitation({
				invitationCode: 'invalid-code',
				visitorIp: '127.0.0.1',
				headers: {},
			}),
			(error: unknown) =>
				error instanceof PocketAuthenticationError && error.code === 'INVALID_INVITATION',
		);
	});

	it('consumes a valid invitation and creates an authenticated session', async () => {
		const invitationCode = 'MDGABC-user-temporary-key';
		const temporaryAccessCode = 'temporary-key';
		const congregationAccessCode = 'congregation-access-code';
		const congregation = new Congregation('congregation-1');
		congregation.settings.country_code = 'MDG';
		congregation.settings.cong_prefix = 'ABC';
		congregation.settings.cong_name = 'Central';
		congregation.settings.cong_access_code = encryptData(
			JSON.stringify(congregationAccessCode),
			temporaryAccessCode,
		);
		const user = new User('user-1');
		user.profile.congregation = {
			id: congregation.id,
			cong_role: ['publisher'],
			account_type: 'pocket',
			user_local_uid: 'person-1',
			pocket_invitation_code: encryptData(
				encryptData(JSON.stringify(invitationCode), congregationAccessCode),
			),
		};
		congregation.members = [user];
		UsersList.list = [user];
		CongregationsList.list = [congregation];

		const result = await authenticatePocketInvitation(
			{
				invitationCode,
				visitorId: 'visitor-1',
				visitorIp: '192.0.2.1',
				headers: { 'user-agent': 'test browser' },
			},
			{
				getSessionDetails: async () => ({
					browser: 'Firefox',
					ip: '192.0.2.1',
					ipLocation: {
						city: 'Antananarivo',
						continent_code: 'AF',
						country_code: 'MDG',
						country_name: 'Madagascar',
						timezone: 'Indian/Antananarivo',
					},
					isMobile: false,
					os: 'Windows',
				}),
				updateProfile: async (target, profile) => {
					target.profile = profile;
				},
				updateSessions: async (target, sessions) => {
					target.sessions = sessions;
				},
				createIdentifier: () => 'session-1',
				getCurrentTime: () => new Date('2026-09-02T10:00:00.000Z'),
			},
		);

		assert.equal(result.visitorId, 'visitor-1');
		assert.equal(result.userInfo.message, 'TOKEN_VALID');
		assert.equal(result.userInfo.app_settings.cong_settings?.cong_name, 'Central');
		assert.equal(user.profile.congregation.pocket_invitation_code, undefined);
		assert.equal(user.sessions[0]?.identifier, 'session-1');
		assert.equal(user.sessions[0]?.last_seen, '2026-09-02T10:00:00.000Z');
		assert.equal(validatePocketSession(user.id).id, user.id);
	});
});
