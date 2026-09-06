import {
	CountryCatalogRequestError,
	getCountries,
} from '#platform/countries/country-client.js';
import {
	CongregationDirectoryRequestError,
	searchCongregations,
	verifyCongregation,
	type CongregationDirectoryRecord,
} from '#platform/congregation-directory/congregation-directory-client.js';
import { ALL_LANGUAGES } from '#platform/localization/languages.js';

type CongregationDirectoryResult =
	| { congregations: CongregationDirectoryRecord[] }
	| { errorStatusCode: number };

export type CongregationDirectoryOperations = {
	getCountries: typeof getCountries;
	searchCongregations: typeof searchCongregations;
	verifyCongregation: typeof verifyCongregation;
};

const defaultDirectoryOperations: CongregationDirectoryOperations = {
	getCountries: (language) => getCountries(language),
	searchCongregations: (query) => searchCongregations(query),
	verifyCongregation: (query) => verifyCongregation(query),
};

const resolveDirectoryOperations = (
	overrides: Partial<CongregationDirectoryOperations>,
): CongregationDirectoryOperations => ({
	...defaultDirectoryOperations,
	...overrides,
});

export const getAvailableCountries = async (
	language: string,
	operations: Partial<CongregationDirectoryOperations> = {},
) => {
	const directory = resolveDirectoryOperations(operations);

	try {
		return { countries: await directory.getCountries(language) };
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
	operations: Partial<CongregationDirectoryOperations> = {},
): Promise<CongregationDirectoryResult> => {
	const directory = resolveDirectoryOperations(operations);

	try {
		return {
			congregations: await directory.searchCongregations({ country, language, name }),
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
	operations: Partial<CongregationDirectoryOperations> = {},
): Promise<CongregationDirectoryResult> => {
	const directory = resolveDirectoryOperations(operations);
	const directoryLanguage =
		ALL_LANGUAGES.find(
			(language) => language.threeLettersCode === requestedLanguage,
		)?.code ?? 'E';

	try {
		return {
			congregations: await directory.verifyCongregation({
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
