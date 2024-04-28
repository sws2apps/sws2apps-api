import { NextFunction, Request, Response } from 'express';
import fetch from 'node-fetch';
import { validationResult } from 'express-validator';
import { CongregationsList } from '../classes/Congregations.js';
import { UsersList } from '../classes/Users.js';
import { ALL_LANGUAGES } from '../constant/langList.js';
import { ApiCongregationSearchResponse } from '../denifition/congregation.js';
import { sendWelcomeMessage } from '../services/mail/sendEmail.js';

const isDev = process.env.NODE_ENV === 'development';

export const getLastCongregationBackup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const uid = req.headers.uid as string;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = UsersList.findByAuthUid(uid)!;
		const adminRole = user.cong_role.includes('admin');

		if (!adminRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to get congregation backup info';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const obj = {
			cong_last_backup: adminRole ? cong.last_backup || 'NO_BACKUP' : undefined,
			user_last_backup: user.last_backup || 'NO_BACKUP',
		};

		res.locals.type = 'info';
		res.locals.message = 'user get the latest backup info for the congregation';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};

export const saveCongregationBackup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const uid = req.headers.uid as string;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = UsersList.findByAuthUid(uid)!;
		const adminRole = user.cong_role.includes('admin');

		if (!adminRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to send congregation backup';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'info';
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
	} catch (err) {
		next(err);
	}
};

export const getCountries = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const language = (req.headers?.language as string) || 'en';
		const JWLang = ALL_LANGUAGES.find((record) => record.locale === language)?.code || 'E';

		const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language: JWLang });

		const response = await fetch(url);

		if (!response.ok) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting list of all countries';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
			return;
		}

		const countriesList = await response.json();
		res.locals.type = 'info';
		res.locals.message = 'user fetched all countries';
		res.status(200).json(countriesList);
	} catch (err) {
		next(err);
	}
};

export const getCongregations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const language = (req.headers.language as string) || 'en';
		const name = req.headers.name as string;
		let country = req.headers.country as string;

		country = country.toUpperCase();
		const JWLang = ALL_LANGUAGES.find((record) => record.locale === language)?.code || 'E';

		const url = process.env.APP_CONGREGATION_API! + new URLSearchParams({ country, language: JWLang, name });

		const response = await fetch(url);

		if (!response.ok) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting congregations list';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
			return;
		}

		const congsList = await response.json();
		res.locals.type = 'info';
		res.locals.message = 'user fetched congregations';
		res.status(200).json(congsList);
	} catch (err) {
		next(err);
	}
};

export const createCongregation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const uid = req.headers.uid as string;
		const country_code = req.body.country_code as string;
		const cong_name = req.body.cong_name as string;
		const cong_number = req.body.cong_number as string;
		const firstname = req.body.firstname as string;
		const lastname = req.body.lastname as string;

		// find congregation
		const cong = CongregationsList.findByCountryAndNumber(country_code, cong_number);
		if (cong) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation requested already exists';
			res.status(404).json({ message: 'CONG_EXISTS' });

			return;
		}

		// is congregation authentic
		const language = req.headers.applanguage || 'en';
		const JWLang = ALL_LANGUAGES.find((record) => record.locale === language)?.code || 'E';
		const url =
			process.env.APP_CONGREGATION_API! + new URLSearchParams({ country: country_code, language: JWLang, name: cong_number });

		const response = await fetch(url);
		if (response.status !== 200) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while verifying the congregation data';
			res.status(response.status).json({ message: 'REQUEST_NOT_VALIDATED' });

			return;
		}

		const congsList = (await response.json()) as [];
		let isValidCong = true;

		if (congsList.length === 0) {
			isValidCong = false;
		}

		if (congsList.length > 0) {
			const tmpCong = congsList.at(0)! as ApiCongregationSearchResponse;
			if (tmpCong.congName !== cong_name || tmpCong.congNumber !== cong_number) {
				isValidCong = false;
			}
		}

		if (!isValidCong) {
			res.locals.type = 'warn';
			res.locals.message = 'this request does not match any valid congregation';
			res.status(400).json({ message: 'BAD_REQUEST' });

			return;
		}

		// update user details
		const user = UsersList.findByAuthUid(uid)!;
		await user.updateFirstname(firstname);
		await user.updateLastname(lastname);

		// create congregation
		const congRequest = congsList.at(0)! as ApiCongregationSearchResponse;

		const congId = await CongregationsList.create({
			cong_name,
			cong_number,
			country_code,
			cong_circuit: congRequest.circuit,
			cong_location: { address: congRequest.address, lat: congRequest.location.lat, lng: congRequest.location.lng },
			midweek_meeting: { time: congRequest.midweekMeetingTime.time, weekday: congRequest.midweekMeetingTime.weekday },
			weekend_meeting: { time: congRequest.weekendMeetingTime.time, weekday: congRequest.weekendMeetingTime.weekday },
		});

		// add user to congregation
		const userCong = await user.assignCongregation({ congId: congId, role: ['admin'] });

		if (!isDev) {
			sendWelcomeMessage(user.user_email!, `${lastname} ${firstname}`, `${cong_name} (${cong_number})`, JWLang);
		}

		const finalResult = {
			cong_id: user.cong_id,
			firstname: user.firstname,
			lastname: user.lastname,
			cong_name: user.cong_name,
			cong_number: user.cong_number,
			cong_role: user.cong_role,
			cong_circuit: userCong.cong_circuit.find((record) => record.type === 'main')!.name,
			cong_location: userCong.cong_location,
			midweek_meeting: userCong.midweek_meeting.find((record) => record.type === 'main'),
			weekend_meeting: userCong.weekend_meeting.find((record) => record.type === 'main'),
		};

		res.locals.type = 'info';
		res.locals.message = 'congregation created successfully';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
};
