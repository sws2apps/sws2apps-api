import {
	CountryCatalogRequestError,
	getCountries,
} from '../../platform/countries/country-client.js';
import {
	CongregationDirectoryRequestError,
	searchCongregations,
	verifyCongregation,
} from '../../platform/congregation-directory/congregation-directory-client.js';
import type { CongregationDirectoryRecord } from '../../platform/congregation-directory/congregation-directory-client.js';
import { ALL_LANGUAGES } from '../../platform/localization/languages.js';

type CongregationDirectoryResult =
	| { congregations: CongregationDirectoryRecord[] }
	| { errorStatusCode: number };

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

export const searchCongregationDirectory = async (
	country: string,
	language: string,
	name: string,
): Promise<CongregationDirectoryResult> => {
	try {
		return {
			congregations: await searchCongregations({ country, language, name }),
		};
	} catch (error) {
		if (error instanceof CongregationDirectoryRequestError) {
			return { errorStatusCode: error.statusCode };
		}

		throw error;
	}
};

export const verifyCongregationDirectoryRecord = async (
	country: string,
	requestedLanguage: string,
	name: string,
): Promise<CongregationDirectoryResult> => {
	const directoryLanguage =
		ALL_LANGUAGES.find(
			(language) => language.threeLettersCode === requestedLanguage,
		)?.code ?? 'E';

	try {
		return {
			congregations: await verifyCongregation({
				country,
				language: directoryLanguage,
				name,
			}),
		};
	} catch (error) {
		if (error instanceof CongregationDirectoryRequestError) {
			return { errorStatusCode: error.statusCode };
		}

		throw error;
	}
};
