import fetch from 'node-fetch';

import { env } from '../../config/env.js';
import type { Country } from '../../domain/countries/country.js';

export class CountryCatalogRequestError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number) {
		super('FETCH_FAILED');
		this.name = 'CountryCatalogRequestError';
		this.statusCode = statusCode;
	}
}

export const getCountries = async (language?: string): Promise<Country[]> => {
	const query = language ? new URLSearchParams({ language }) : '';
	const countryApiUrl = env.appCountryApi + query;
	const countryApiResponse = await fetch(countryApiUrl);

	if (!countryApiResponse.ok) {
		throw new CountryCatalogRequestError(countryApiResponse.status);
	}

	return countryApiResponse.json() as Promise<Country[]>;
};
