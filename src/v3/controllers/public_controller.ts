import { Request, Response } from 'express';
import fetch from 'node-fetch';

import { Country } from '../definition/app.js';
import { CongregationByCountry } from '../definition/congregation.js';
import { CongregationsList } from '../classes/Congregations.js';
import { UsersList } from '../classes/Users.js';

export const getSchedules = async (req: Request, res: Response) => {
	let { language } = req.params;

	language = language?.toUpperCase() || 'E';

	const url = `${process.env.SOURCE_MATERIALS_API}/${language}`;
	const resSrc = await fetch(url);

	const result = (await resSrc.json()) as [];

	if (result.length > 0) {
		res.locals.type = 'info';
		res.locals.message = 'updated schedules fetched from jw.org';
		res.status(200).json(result);
	} else {
		res.locals.type = 'warn';
		res.locals.message = 'schedules could not be fetched because language is invalid or not available yet';
		res.status(404).json({ message: 'FETCHING_FAILED' });
	}
};

export const getStats = async (req: Request, res: Response) => {
	const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language: 'E' });

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('FETCH_FAILED');
	}

	const countries = (await response.json()) as Country[];

	const congs = CongregationsList.list;
	const users = UsersList.list.filter((record) => record.profile.role !== 'admin');

	const congsByCountry = congs.reduce((acc: CongregationByCountry[], current) => {
		const country = acc.find((record) => record.country_code === current.settings.country_code);

		if (!country) {
			const details = countries.find((record) => record.countryCode === current.settings.country_code);

			acc.push({
				country_name: details?.countryName || 'Unknown',
				country_code: current.settings.country_code,
				congregations: 1,
			});
		}

		if (country) {
			country.congregations++;
		}

		return acc;
	}, []);

	const result = {
		congregations: congs.length,
		users: users.length,
		countries: {
			count: congsByCountry.length,
			list: congsByCountry,
		},
	};

	res.locals.type = 'info';
	res.locals.message = 'app stats generated';
	res.status(200).json(result);
};
