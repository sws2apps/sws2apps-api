import {
	CountryCatalogRequestError,
	getCountries,
} from '../../platform/countries/country-client.js';

export const getAvailableCountries = async (language: string) => {
	try {
		return { countries: await getCountries(language) };
	} catch (error) {
		if (error instanceof CountryCatalogRequestError) {
			return { errorStatusCode: error.statusCode };
		}

		throw error;
	}
};
