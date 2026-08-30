import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CongregationsList } from './congregations.js';
import { formatError } from '../../http/validation-errors.js';
import { toMondayFirstWeekday } from './meeting-weekday.js';
import {
	getAvailableCountries,
	searchCongregationDirectory,
	verifyCongregationDirectoryRecord,
} from './congregation-directory.service.js';
import {
	isWelcomeEmailEnabled,
	sendWelcomeEmail,
} from './congregation-notifications.service.js';
import {
	CongregationApplicationError,
	deleteCongregationApplication,
	updateCongregationApplication,
} from './congregation-applications.service.js';

const handleCongregationApplicationError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationApplicationError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	res.locals.message = error.code === 'MEMBERSHIP_REQUIRED'
		? 'user not authorized to access the provided congregation'
		: 'user not authorized to process this application';
	res.status(403).json({ message: 'error_api_unauthorized-request' });
	return true;
};

export const getCountries = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

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
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

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

export const createCongregation = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { country_code, country_guid, cong_name, firstname, lastname } = req.body as Record<string, string>;

	// find congregation
	const cong = CongregationsList.findByCountryAndName(country_guid, cong_name, country_code);

	if (cong) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation requested already exists';
		res.status(404).json({ message: 'CONG_EXISTS' });

		return;
	}

	// is congregation authentic
	const language = (req.headers.language as string) || 'eng';

	const directoryResult = await verifyCongregationDirectoryRecord(
		country_guid,
		language,
		cong_name,
	);

	if ('errorStatusCode' in directoryResult) {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while verifying the congregation data';
		res.status(directoryResult.errorStatusCode).json({ message: 'REQUEST_NOT_VALIDATED' });

		return;
	}

	const congsList = directoryResult.congregations;

	let isValidCong = false;

	if (congsList?.length > 0) {
		const findCong = congsList.find((record) => record.congName === cong_name);

		if (findCong) {
			isValidCong = true;
		}
	}

	if (!isValidCong) {
		res.locals.type = 'warn';
		res.locals.message = 'this request does not match any valid congregation';
		res.status(400).json({ message: 'BAD_REQUEST' });

		return;
	}

	// update user details
	const user = res.locals.currentUser;

	const profile = structuredClone(user.profile);
	profile.firstname = { value: firstname, updatedAt: new Date().toISOString() };
	profile.lastname = { value: lastname, updatedAt: new Date().toISOString() };

	await user.updateProfile(profile);

	// create congregation
	const congRequest = congsList.find((record) => record.congName === cong_name)!;

	const congId = await CongregationsList.create({
		cong_name,
		country_guid,
		country_code,
		cong_guid: congRequest.congGuid,
		cong_circuit: congRequest.circuit,
		cong_location: { address: congRequest.address, lat: congRequest.location.lat, lng: congRequest.location.lng },
		midweek_meeting: {
			time: congRequest.midweekMeetingTime.time.slice(0, -3),
			weekday: toMondayFirstWeekday(congRequest.midweekMeetingTime.weekday),
		},
		weekend_meeting: {
			time: congRequest.weekendMeetingTime.time.slice(0, -3),
			weekday: toMondayFirstWeekday(congRequest.weekendMeetingTime.weekday),
		},
	});

	// add user to congregation
	const userCong = await user.assignCongregation({ congId: congId, role: ['admin'] });

	if (isWelcomeEmailEnabled()) {
		req.i18n.changeLanguage(language);

		sendWelcomeEmail({
			recipient: user.email!,
			subject: req.t('tr_welcomeTitle'),
			welcomeTitle: req.t('tr_welcomeTitle'),
			welcomeDescription: req.t('tr_welcomeDesc'),
			watchVideoLabel: req.t('tr_watchVideoLabel'),
			moreInformationTitle: req.t('tr_moreInfoTitle'),
			guideLabel: req.t('tr_moreInfoGuideLabel'),
			blogLabel: req.t('tr_moreInfoBlogLabel'),
			supportLabel: req.t('tr_moreInfoSupportLabel'),
		});
	}

	const finalResult = {
		user_id: user.id,
		cong_id: userCong.id,
		firstname: user.profile.firstname.value,
		lastname: user.profile.lastname.value,
		cong_settings: userCong.settings,
	};

	res.locals.type = 'info';
	res.locals.message = 'congregation created successfully';
	res.status(200).json(finalResult);
};

export const updateApplicationApproval = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	if (!request) {
		res.locals.type = 'warn';
		res.locals.message = 'the application request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const user = res.locals.currentUser;
	const roles = user.profile.congregation!.cong_role;
	let result;
	try {
		result = await updateCongregationApplication(
			id,
			user.id,
			roles,
			req.body.application,
		);
	} catch (error) {
		if (!handleCongregationApplicationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user updated application approval';
	res.status(200).json(result);
};

export const deleteApplication = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	if (!request) {
		res.locals.type = 'warn';
		res.locals.message = 'the application request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const user = res.locals.currentUser;
	const roles = user.profile.congregation!.cong_role;
	let result;
	try {
		result = await deleteCongregationApplication(id, user.id, roles, request);
	} catch (error) {
		if (!handleCongregationApplicationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user deleted application';
	res.status(200).json(result);
};
