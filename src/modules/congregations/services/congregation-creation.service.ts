import {
	UsersList,
	assignUserToCongregation,
	updateUserProfile,
	type User,
} from '#modules/users/index.js';
import { verifyCongregationDirectoryRecord } from './congregation-directory.service.js';
import { CongregationsList } from '../congregations.js';
import { toMondayFirstWeekday } from '../meeting-weekday.js';
import type { CongregationCreateInfoType } from '../types/congregations.types.js';
import { createPersistedCongregation } from '../repositories/congregation-lifecycle.repository.js';
import { Congregation } from '../congregation.js';
import { refreshCongregationMembers } from './congregation-members.service.js';
import { hydrateCongregation } from './congregation-hydration.service.js';

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

export type ApplicationCongregationCreationOperations = {
	createPersistedCongregation: typeof createPersistedCongregation;
	hydrateCongregation: typeof hydrateCongregation;
	refreshMembers: typeof refreshCongregationMembers;
	addCongregation: (congregation: Congregation) => void;
};

const defaultApplicationCreationOperations: ApplicationCongregationCreationOperations = {
	createPersistedCongregation: (data) => createPersistedCongregation(data),
	hydrateCongregation: (congregation) => hydrateCongregation(congregation),
	refreshMembers: (congregation) => refreshCongregationMembers(congregation),
	addCongregation: (congregation) => CongregationsList.add(congregation),
};

export type VerifiedCongregationCreationOperations = {
	findExistingCongregation: (
		countryGuid: string,
		congregationName: string,
		countryCode: string,
	) => Congregation | undefined;
	verifyDirectoryRecord: typeof verifyCongregationDirectoryRecord;
	findUserById: (userId: string) => User | undefined;
	updateProfile: typeof updateUserProfile;
	createCongregation: (
		data: CongregationCreateInfoType,
	) => Promise<Congregation>;
	assignUser: typeof assignUserToCongregation;
	getCurrentTimestamp: () => string;
};

const defaultVerifiedCreationOperations: VerifiedCongregationCreationOperations = {
	findExistingCongregation: (countryGuid, congregationName, countryCode) => {
		return CongregationsList.findByCountryAndName(
			countryGuid,
			congregationName,
			countryCode,
		);
	},
	verifyDirectoryRecord: (countryGuid, language, congregationName) => {
		return verifyCongregationDirectoryRecord(
			countryGuid,
			language,
			congregationName,
		);
	},
	findUserById: (userId) => UsersList.findById(userId),
	updateProfile: (user, profile) => updateUserProfile(user, profile),
	createCongregation: (data) => createApplicationCongregation(data),
	assignUser: (user, congregation, input) => {
		return assignUserToCongregation(user, congregation, input);
	},
	getCurrentTimestamp: () => new Date().toISOString(),
};

/**
 * Creates and fully hydrates a congregation before publishing it to the
 * application cache. A hydration failure therefore cannot expose partial
 * congregation state to concurrent requests.
 */
export const createApplicationCongregation = async (
	data: CongregationCreateInfoType,
	operations: Partial<ApplicationCongregationCreationOperations> = {},
): Promise<Congregation> => {
	const creation = {
		...defaultApplicationCreationOperations,
		...operations,
	};
	const congregationId = await creation.createPersistedCongregation(data);
	const congregation = new Congregation(congregationId);

	await creation.hydrateCongregation(congregation);
	creation.refreshMembers(congregation);
	creation.addCongregation(congregation);

	return congregation;
};

/**
 * Verifies a congregation against the external directory, creates it, and
 * assigns its creator as administrator. Directory failures retain their status
 * for translation at the HTTP boundary.
 */
export const createVerifiedCongregation = async (
	input: CreateCongregationInput,
	operations: Partial<VerifiedCongregationCreationOperations> = {},
) => {
	const creation = {
		...defaultVerifiedCreationOperations,
		...operations,
	};
	const existingCongregation = creation.findExistingCongregation(
		input.countryGuid,
		input.congregationName,
		input.countryCode,
	);

	if (existingCongregation) {
		throw new CongregationCreationError('CONGREGATION_EXISTS');
	}

	const directoryResult = await creation.verifyDirectoryRecord(
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

	const user = creation.findUserById(input.userId)!;
	const profile = structuredClone(user.profile);
	const updatedAt = creation.getCurrentTimestamp();
	profile.firstname = { value: input.firstname, updatedAt };
	profile.lastname = { value: input.lastname, updatedAt };
	await creation.updateProfile(user, profile);

	const congregation = await creation.createCongregation({
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

	await creation.assignUser(user, congregation, {
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
