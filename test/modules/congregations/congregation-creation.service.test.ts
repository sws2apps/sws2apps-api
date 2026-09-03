import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	CongregationCreationError,
	createApplicationCongregation,
	createVerifiedCongregation,
	type CongregationCreateInfoType,
} from '#modules/congregations/index.js';
import { User } from '#modules/users/user.js';

const congregationData: CongregationCreateInfoType = {
	cong_name: 'Central',
	country_guid: 'country-guid',
	country_code: 'MG',
	cong_guid: 'congregation-guid',
	cong_circuit: 'MG-01',
	cong_location: {
		address: 'Central district',
		lat: -18.8792,
		lng: 47.5079,
	},
	midweek_meeting: { time: '18:30', weekday: 1 },
	weekend_meeting: { time: '09:00', weekday: 6 },
};

const verifiedCreationInput = {
	userId: 'user-1',
	countryCode: 'MG',
	countryGuid: 'country-guid',
	congregationName: 'Central',
	firstname: 'Ada',
	lastname: 'Lovelace',
	language: 'eng',
};

describe('application congregation creation', () => {
	it('persists, hydrates, refreshes, and then publishes the congregation', async () => {
		const completedOperations: string[] = [];

		const congregation = await createApplicationCongregation(congregationData, {
			createPersistedCongregation: async (data) => {
				assert.deepEqual(data, congregationData);
				completedOperations.push('persist');
				return 'congregation-1';
			},
			hydrateCongregation: async (createdCongregation) => {
				assert.equal(createdCongregation.id, 'congregation-1');
				createdCongregation.settings.cong_name = 'Central';
				completedOperations.push('hydrate');
			},
			refreshMembers: (createdCongregation) => {
				assert.equal(createdCongregation.settings.cong_name, 'Central');
				completedOperations.push('members');
			},
			addCongregation: (createdCongregation) => {
				assert.equal(createdCongregation.settings.cong_name, 'Central');
				completedOperations.push('cache');
			},
		});

		assert.equal(congregation.id, 'congregation-1');
		assert.deepEqual(completedOperations, [
			'persist',
			'hydrate',
			'members',
			'cache',
		]);
	});

	it('does not publish a congregation when hydration fails', async () => {
		const completedOperations: string[] = [];

		await assert.rejects(
			createApplicationCongregation(congregationData, {
				createPersistedCongregation: async () => {
					completedOperations.push('persist');
					return 'congregation-1';
				},
				hydrateCongregation: async () => {
					completedOperations.push('hydrate');
					throw new Error('Hydration failed');
				},
				refreshMembers: () => completedOperations.push('members'),
				addCongregation: () => completedOperations.push('cache'),
			}),
			/Hydration failed/,
		);

		assert.deepEqual(completedOperations, ['persist', 'hydrate']);
	});
});

describe('verified congregation creation', () => {
	it('rejects a congregation already present in the application', async () => {
		let directoryQueried = false;

		await assert.rejects(
			createVerifiedCongregation(verifiedCreationInput, {
				findExistingCongregation: () => new Congregation('congregation-1'),
				verifyDirectoryRecord: async () => {
					directoryQueried = true;
					return { congregations: [] };
				},
			}),
			(error: unknown) => {
				assert.ok(error instanceof CongregationCreationError);
				assert.equal(error.code, 'CONGREGATION_EXISTS');
				return true;
			},
		);

		assert.equal(directoryQueried, false);
	});

	it('preserves the directory failure status for the HTTP boundary', async () => {
		await assert.rejects(
			createVerifiedCongregation(verifiedCreationInput, {
				findExistingCongregation: () => undefined,
				verifyDirectoryRecord: async () => ({ errorStatusCode: 503 }),
			}),
			(error: unknown) => {
				assert.ok(error instanceof CongregationCreationError);
				assert.equal(error.code, 'DIRECTORY_FETCH_FAILED');
				assert.equal(error.statusCode, 503);
				return true;
			},
		);
	});

	it('rejects a directory response without the requested congregation', async () => {
		await assert.rejects(
			createVerifiedCongregation(verifiedCreationInput, {
				findExistingCongregation: () => undefined,
				verifyDirectoryRecord: async () => ({ congregations: [] }),
			}),
			(error: unknown) => {
				assert.ok(error instanceof CongregationCreationError);
				assert.equal(error.code, 'DIRECTORY_RECORD_INVALID');
				return true;
			},
		);
	});

	it('maps verified directory data and assigns the creator as administrator', async () => {
		const user = new User('user-1');
		user.profile.role = 'vip';
		user.email = 'ada@example.com';
		const congregation = new Congregation('congregation-1');
		congregation.settings.cong_name = 'Central';
		const completedOperations: string[] = [];
		let createdData: CongregationCreateInfoType | undefined;

		const result = await createVerifiedCongregation(verifiedCreationInput, {
			findExistingCongregation: (countryGuid, congregationName, countryCode) => {
				assert.deepEqual(
					[countryGuid, congregationName, countryCode],
					['country-guid', 'Central', 'MG'],
				);
				return undefined;
			},
			verifyDirectoryRecord: async (countryGuid, language, congregationName) => {
				assert.deepEqual(
					[countryGuid, language, congregationName],
					['country-guid', 'eng', 'Central'],
				);
				completedOperations.push('directory');
				return {
					congregations: [
						{
							congName: 'Central',
							congGuid: 'congregation-guid',
							address: 'Central district',
							location: { lat: -18.8792, lng: 47.5079 },
							midweekMeetingTime: { weekday: 2, time: '18:30:00' },
							weekendMeetingTime: { weekday: 0, time: '09:00:00' },
							circuit: 'MG-01',
						},
					],
				};
			},
			findUserById: (userId) => {
				assert.equal(userId, user.id);
				return user;
			},
			getCurrentTimestamp: () => '2026-09-03T10:00:00.000Z',
			updateProfile: async (updatedUser, profile) => {
				assert.equal(updatedUser, user);
				assert.deepEqual(profile.firstname, {
					value: 'Ada',
					updatedAt: '2026-09-03T10:00:00.000Z',
				});
				assert.deepEqual(profile.lastname, {
					value: 'Lovelace',
					updatedAt: '2026-09-03T10:00:00.000Z',
				});
				user.profile = profile;
				completedOperations.push('profile');
			},
			createCongregation: async (data) => {
				createdData = data;
				completedOperations.push('congregation');
				return congregation;
			},
			assignUser: async (assignedUser, assignedCongregation, input) => {
				assert.equal(assignedUser, user);
				assert.equal(assignedCongregation, congregation);
				assert.deepEqual(input.role, ['admin']);
				completedOperations.push('assignment');
			},
		});

		assert.deepEqual(createdData, {
			cong_name: 'Central',
			country_guid: 'country-guid',
			country_code: 'MG',
			cong_guid: 'congregation-guid',
			cong_circuit: 'MG-01',
			cong_location: {
				address: 'Central district',
				lat: -18.8792,
				lng: 47.5079,
			},
			midweek_meeting: { time: '18:30', weekday: 1 },
			weekend_meeting: { time: '09:00', weekday: 6 },
		});
		assert.deepEqual(completedOperations, [
			'directory',
			'profile',
			'congregation',
			'assignment',
		]);
		assert.equal(result.response.user_id, user.id);
		assert.equal(result.response.cong_id, congregation.id);
		assert.equal(result.response.firstname, 'Ada');
		assert.equal(result.response.lastname, 'Lovelace');
		assert.equal(result.notificationRecipient, 'ada@example.com');
	});
});
