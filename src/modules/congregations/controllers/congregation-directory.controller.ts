import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import {
	getAvailableCountries,
	searchCongregationDirectory,
} from '../services/congregation-directory.service.js';

export const getCountries = async (req: Request, res: Response) => {
	const language = (req.query.language as string) || 'E';

	const countryResult = await getAvailableCountries(language);

	if (countryResult.errorStatusCode) {
		sendClientError(res, countryResult.errorStatusCode, 'FETCH_FAILED', 'an error occured while getting list of all countries');
		return;
	}

	sendSuccess(res, countryResult.countries, 'user fetched all countries');
};

export const getCongregations = async (req: Request, res: Response) => {
	const language = (req.query.language as string) || 'E';
	const name = req.query.name as string;
	let country = req.query.country as string;


	if (name.length < 2 || country?.length === 0) {
		sendClientError(res, 400, 'error_api_bad-request', 'country or name is invalid');

		return;
	}

	country = country.toUpperCase();

	const directoryResult = await searchCongregationDirectory(
		country,
		language,
		name,
	);

	if ('errorStatusCode' in directoryResult) {
		sendClientError(res, directoryResult.errorStatusCode, 'FETCH_FAILED', 'an error occured while getting congregations list');
		return;
	}

	sendSuccess(res, directoryResult.congregations, 'user fetched congregations');
};
