import {
	CountryCatalogRequestError,
	getCountries,
} from '../../platform/countries/country-client.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';

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
	const congregation = CongregationsList.findById(congregationId)!;
	const congregationMembers = congregation.getMembers('undefined');

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
