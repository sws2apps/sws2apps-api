import { validationResult } from 'express-validator';
import { countries } from '../classes/Countries.js';

export const getCountries = async (req, res, next) => {
	try {
		const countriesList = countries.list;

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all countries';
		res.status(200).json(countriesList);
	} catch (err) {
		next(err);
	}
};

export const geoBulkImport = async (req, res, next) => {
	try {
		const { geo_list, language } = req.body;

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const langsAllowed = ['E', 'MG'];
		if (langsAllowed.includes(language) === false) {
			res.locals.type = 'warn';
			res.locals.message = `invalid language`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		for await (const item of geo_list) {
			const country = countries.findByCountryCode(item.code);
			if (country) {
				await country.update(item, language);
			} else {
				await countries.add(item, language);
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'geo locations imported successfully';
		res.status(200).json({ message: 'IMPORT_SUCCESS' });
	} catch (err) {
		next(err);
	}
};

export const congBulkImport = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { cong_list, language } = req.body;

		if (id) {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			const langsAllowed = ['E', 'MG'];
			if (langsAllowed.includes(language) === false) {
				res.locals.type = 'warn';
				res.locals.message = `invalid language`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			const country = countries.findById(id);

			if (country) {
				for await (const item of cong_list) {
					const cong = country.findCongregationByNumber(item.number);
					if (cong) {
						await country.updateCongregation(item, language);
					} else {
						await country.addCongregation(item, language);
					}
				}

				res.locals.type = 'info';
				res.locals.message = 'geo locations imported successfully';
				res.status(200).json({ message: 'IMPORT_SUCCESS' });
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'the country could not be found';
				res.status(400).json({ message: 'COUNTRY_ID_INVALID' });
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the geo id params is not defined';
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};
