import {
	CountryCatalogRequestError,
	getCountries,
} from '../../platform/countries/country-client.js';
import { CongregationsList } from '../congregations/index.js';
import { createApplicationCongregation } from '../congregations/index.js';
import { getCongregationMembers } from '../congregations/index.js';
import { deleteCongregation } from '../congregations/index.js';
import { saveOutgoingSpeakersState } from '../congregations/index.js';
import { UsersList } from '../users/index.js';

export type AdministrationCongregationErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'CONGREGATION_ACTIVE'
	| 'CONGREGATION_EXISTS'
	| 'COUNTRY_FETCH_FAILED';

export class AdministrationCongregationError extends Error {
	constructor(
		public readonly code: AdministrationCongregationErrorCode,
		public readonly statusCode?: number,
	) {
		super(code);
		this.name = 'AdministrationCongregationError';
	}
}

const getCongregation = (congregationId: string) => {
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new AdministrationCongregationError('CONGREGATION_NOT_FOUND');
	return congregation;
};

export const getAdministrationCongregations = async () => {
	const countries = await getCountries('E');
	const congregations = [];

	for (const congregation of CongregationsList.list) {
		const country = countries.find(
			(record) => record.countryCode === congregation.settings.country_code,
		);

		congregations.push({
			id: congregation.id,
			country_code: congregation.settings.country_code,
			country_name: country?.countryName || 'Unknown',
			cong_name: congregation.settings.cong_name,
			cong_prefix: congregation.settings.cong_prefix,
			cong_number: congregation.settings.cong_number?.value,
			cong_guid: congregation.settings.cong_guid ?? '',
			createdAt: congregation.createdAt,
			data_sync: congregation.settings.data_sync.value,
		});
	}

	return congregations;
};

export const findAdministrationCountry = async (countryCode: string) => {
	try {
		const countries = await getCountries();

		return {
			country: countries.find((country) => country.countryCode === countryCode),
		};
	} catch (error) {
		if (error instanceof CountryCatalogRequestError) {
			return { errorStatusCode: error.statusCode };
		}

		throw error;
	}
};

export const getAdministrationCongregation = (congregationId: string) => {
	const congregation = getCongregation(congregationId);
	const congregationMembers = getCongregationMembers(congregation, 'undefined');

	const congregationPersons = congregationMembers.map((person) => {
		const user = UsersList.findById(person.id);

		return {
			id: person.id,
			sessions: person.sessions,
			profile: {
				...person.profile,
				email: user?.email,
				mfa_enabled: user?.profile.mfa_enabled,
				congregation: {
					id: congregation.id,
					cong_role: person.profile.cong_role || [],
				},
			},
		};
	});

	const congregationRequests = congregation.outgoing_speakers.access
		.map((access) => {
			const requestingCongregation = CongregationsList.findById(access.cong_id)!;

			return {
				cong_id: access.cong_id,
				request_id: access.request_id,
				cong_country: requestingCongregation.settings.country_code,
				cong_prefix: requestingCongregation.settings.cong_prefix,
				cong_number: requestingCongregation.settings.cong_number?.value,
				cong_name: requestingCongregation.settings.cong_name,
				request_status: access.status,
			};
		})
		.sort((firstRequest, secondRequest) => {
			if (firstRequest.cong_country === secondRequest.cong_country) {
				return firstRequest.cong_name.localeCompare(secondRequest.cong_name);
			}

			return firstRequest.cong_country.localeCompare(secondRequest.cong_country);
		});

	const hasSpeakersKey = Boolean(congregation.outgoing_speakers.speakers_key?.length);

	return {
		cong_persons: congregationPersons,
		cong_requests: congregationRequests,
		has_speakers_key: hasSpeakersKey,
	};
};

export const deleteAdministrationCongregation = async (congregationId: string) => {
	const congregation = getCongregation(congregationId);

	if (congregation.members.length > 0) {
		throw new AdministrationCongregationError('CONGREGATION_ACTIVE');
	}

	await deleteCongregation(congregationId);
	return getAdministrationCongregations();
};

export const toggleAdministrationCongregationDataSync = async (
	congregationId: string,
) => {
	const congregation = getCongregation(congregationId);
	const settings = structuredClone(congregation.settings);
	settings.data_sync = {
		value: !settings.data_sync.value,
		updatedAt: new Date().toISOString(),
	};

	await congregation.saveSettings(settings);
	return getAdministrationCongregation(congregationId);
};

export const createAdministrationCongregation = async (
	countryCode: string,
	congregationName: string,
) => {
	if (CongregationsList.findByCountryAndName(countryCode, congregationName)) {
		throw new AdministrationCongregationError('CONGREGATION_EXISTS');
	}

	const countryResult = await findAdministrationCountry(countryCode);
	if (countryResult.errorStatusCode) {
		throw new AdministrationCongregationError(
			'COUNTRY_FETCH_FAILED',
			countryResult.errorStatusCode,
		);
	}

	await createApplicationCongregation({
		cong_circuit: '',
		cong_location: { address: '', lat: 0, lng: 0 },
		cong_name: congregationName,
		country_guid: countryResult.country?.countryGuid || crypto.randomUUID(),
		cong_guid: '',
		country_code: countryCode,
		midweek_meeting: { time: '18:30', weekday: 2 },
		weekend_meeting: { time: '10:00', weekday: 6 },
	});

	return getAdministrationCongregations();
};

export const deleteAdministrationSpeakerAccessRequest = async (
	congregationId: string,
	requestId: string,
) => {
	const congregation = getCongregation(congregationId);
	congregation.outgoing_speakers.access = congregation.outgoing_speakers.access.filter(
		(record) => record.request_id !== requestId,
	);

	await saveOutgoingSpeakersState(congregationId, congregation.outgoing_speakers);
	return getAdministrationCongregation(congregationId);
};

export const resetAdministrationSpeakersKey = async (congregationId: string) => {
	const congregation = getCongregation(congregationId);
	congregation.outgoing_speakers = { access: [], list: [], speakers_key: '' };

	await congregation.saveSpeakersKey('');
	await saveOutgoingSpeakersState(congregationId, congregation.outgoing_speakers);

	return getAdministrationCongregation(congregationId);
};

type UpdateAdministrationCongregationInput = {
	name: string;
	number: string;
	guid: string;
};

export const updateAdministrationCongregation = async (
	congregationId: string,
	input: UpdateAdministrationCongregationInput,
) => {
	const congregation = getCongregation(congregationId);
	const settings = structuredClone(congregation.settings);

	if (input.number !== undefined && input.number !== settings.cong_number?.value) {
		settings.cong_number = {
			value: input.number,
			updatedAt: new Date().toISOString(),
		};
	}

	if (input.name !== settings.cong_name) settings.cong_name = input.name;
	if (input.guid !== settings.cong_guid) settings.cong_guid = input.guid;

	await congregation.saveSettings(settings);
	return getAdministrationCongregations();
};
