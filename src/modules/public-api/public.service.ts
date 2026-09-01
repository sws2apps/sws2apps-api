import type { Country } from '../../domain/countries/country.js';
import { getCountries } from '../../platform/countries/country-client.js';
import { getApplicationLanguageCount } from '../../platform/localization/crowdin-client.js';
import type { CongregationByCountry } from '../congregations/index.js';
import { CongregationsList } from '../congregations/index.js';
import { UsersList } from '../users/index.js';

type CongregationSummary = {
	settings: {
		country_code: string;
	};
};

type UserSummary = {
	profile: {
		role: string;
	};
};

type BuildPublicStatsInput = {
	countries: Country[];
	congregations: CongregationSummary[];
	users: UserSummary[];
	languages: number;
};

export const buildPublicStats = ({ countries, congregations, users, languages }: BuildPublicStatsInput) => {
	const nonAdminUsers = users.filter((user) => user.profile.role !== 'admin');

	const congregationsByCountry = congregations.reduce((countriesWithCongregations: CongregationByCountry[], congregation) => {
		const existingCountry = countriesWithCongregations.find(
			(country) => country.country_code === congregation.settings.country_code,
		);

		if (existingCountry) {
			existingCountry.congregations++;
			return countriesWithCongregations;
		}

		const countryDetails = countries.find(
			(country) => country.countryCode === congregation.settings.country_code,
		);

		countriesWithCongregations.push({
			country_name: countryDetails?.countryName || 'Unknown',
			country_code: congregation.settings.country_code,
			congregations: 1,
		});

		return countriesWithCongregations;
	}, []);

	return {
		languages,
		congregations: congregations.length,
		users: nonAdminUsers.length,
		countries: {
			count: congregationsByCountry.length,
			list: congregationsByCountry,
		},
	};
};

export const getPublicStats = async () => {
	const countries = await getCountries('E');
	const languages = await getApplicationLanguageCount();

	return buildPublicStats({
		countries,
		congregations: CongregationsList.list,
		users: UsersList.list,
		languages,
	});
};
