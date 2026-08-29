import fetch from 'node-fetch';

import { env } from '../../config/env.js';
import type { Country } from '../../domain/countries/country.js';

export const getCountries = async (language: string): Promise<Country[]> => {
	const countryApiUrl = env.appCountryApi + new URLSearchParams({ language });
	const countryApiResponse = await fetch(countryApiUrl);

	if (!countryApiResponse.ok) {
		throw new Error('FETCH_FAILED');
	}

	return countryApiResponse.json() as Promise<Country[]>;
};
