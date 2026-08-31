import { UsersList } from '../users/users.js';
import { verifyCongregationDirectoryRecord } from './congregation-directory.service.js';
import { CongregationsList } from './congregations.js';
import { assignUserToCongregation } from '../users/user-congregation-membership.service.js';
import { toMondayFirstWeekday } from './meeting-weekday.js';
import type { CongregationCreateInfoType } from './congregations.types.js';
import { createPersistedCongregation } from './congregation-lifecycle.repository.js';
import { Congregation } from './congregation.js';
import { refreshCongregationMembers } from './congregation-members.service.js';

export type CongregationCreationErrorCode =
	| 'CONGREGATION_EXISTS'
	| 'DIRECTORY_FETCH_FAILED'
	| 'DIRECTORY_RECORD_INVALID';

export class CongregationCreationError extends Error {
	constructor(
		public readonly code: CongregationCreationErrorCode,
		public readonly statusCode?: number,
	) {
		super(code);
		this.name = 'CongregationCreationError';
	}
}

type CreateCongregationInput = {
	userId: string;
	countryCode: string;
	countryGuid: string;
	congregationName: string;
	firstname: string;
	lastname: string;
	language: string;
};

export const createApplicationCongregation = async (
	data: CongregationCreateInfoType,
): Promise<Congregation> => {
	const congregationId = await createPersistedCongregation(data);
	const congregation = new Congregation(congregationId);

	await congregation.loadDetails();
	refreshCongregationMembers(congregation);
	CongregationsList.add(congregation);

	return congregation;
};

export const createVerifiedCongregation = async (input: CreateCongregationInput) => {
	const existingCongregation = CongregationsList.findByCountryAndName(
		input.countryGuid,
		input.congregationName,
		input.countryCode,
	);

	if (existingCongregation) {
		throw new CongregationCreationError('CONGREGATION_EXISTS');
	}

	const directoryResult = await verifyCongregationDirectoryRecord(
		input.countryGuid,
		input.language,
		input.congregationName,
	);

	if ('errorStatusCode' in directoryResult) {
		throw new CongregationCreationError(
			'DIRECTORY_FETCH_FAILED',
			directoryResult.errorStatusCode,
		);
	}

	const directoryCongregation = directoryResult.congregations.find(
		(record) => record.congName === input.congregationName,
	);

	if (!directoryCongregation) {
		throw new CongregationCreationError('DIRECTORY_RECORD_INVALID');
	}

	const user = UsersList.findById(input.userId)!;
	const profile = structuredClone(user.profile);
	const updatedAt = new Date().toISOString();
	profile.firstname = { value: input.firstname, updatedAt };
	profile.lastname = { value: input.lastname, updatedAt };
	await user.updateProfile(profile);

	const congregation = await createApplicationCongregation({
		cong_name: input.congregationName,
		country_guid: input.countryGuid,
		country_code: input.countryCode,
		cong_guid: directoryCongregation.congGuid,
		cong_circuit: directoryCongregation.circuit,
		cong_location: {
			address: directoryCongregation.address,
			lat: directoryCongregation.location.lat,
			lng: directoryCongregation.location.lng,
		},
		midweek_meeting: {
			time: directoryCongregation.midweekMeetingTime.time.slice(0, -3),
			weekday: toMondayFirstWeekday(directoryCongregation.midweekMeetingTime.weekday),
		},
		weekend_meeting: {
			time: directoryCongregation.weekendMeetingTime.time.slice(0, -3),
			weekday: toMondayFirstWeekday(directoryCongregation.weekendMeetingTime.weekday),
		},
	});

	await assignUserToCongregation(user, congregation, {
		role: ['admin'],
	});

	return {
		response: {
			user_id: user.id,
			cong_id: congregation.id,
			firstname: user.profile.firstname.value,
			lastname: user.profile.lastname.value,
			cong_settings: congregation.settings,
		},
		notificationRecipient: user.email!,
	};
};
