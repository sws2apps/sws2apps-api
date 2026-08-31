import type { Request, Response } from 'express';
import {
	getAvailableCountries,
	searchCongregationDirectory,
} from './congregation-directory.service.js';

export const getCountries = async (req: Request, res: Response) => {
	const language = (req.query.language as string) || 'E';

	const countryResult = await getAvailableCountries(language);

	if (countryResult.errorStatusCode) {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while getting list of all countries';
		res.status(countryResult.errorStatusCode).json({ message: 'FETCH_FAILED' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user fetched all countries';
	res.status(200).json(countryResult.countries);
};

export const getCongregations = async (req: Request, res: Response) => {
	const language = (req.query.language as string) || 'E';
	const name = req.query.name as string;
	let country = req.query.country as string;


	if (name.length < 2 || country?.length === 0) {
		res.locals.type = 'warn';
		res.locals.message = `country or name is invalid`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	country = country.toUpperCase();

	const directoryResult = await searchCongregationDirectory(
		country,
		language,
		name,
	);

	if ('errorStatusCode' in directoryResult) {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while getting congregations list';
		res.status(directoryResult.errorStatusCode).json({ message: 'FETCH_FAILED' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user fetched congregations';
	res.status(200).json(directoryResult.congregations);
};

