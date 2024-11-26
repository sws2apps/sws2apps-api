import fetch from 'node-fetch';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CongregationsList } from '../classes/Congregations.js';
import { ApiCongregationSearchResponse } from '../definition/congregation.js';
import { formatError } from '../utils/format_log.js';
import { StandardRecord } from '../definition/app.js';
import { MailClient } from '../config/mail_config.js';

const MAIL_ENABLED = process.env.MAIL_ENABLED === 'true';

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

	const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language });

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

	const url = process.env.APP_CONGREGATION_API! + new URLSearchParams({ country, language, name });

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
	const language = (req.headers.language as string) || 'en';
	const url = process.env.APP_CONGREGATION_API! + new URLSearchParams({ country: country_code, language, name: cong_number });

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
	const user = res.locals.currentUser;

	const profile = structuredClone(user.profile);
	profile.firstname = { value: firstname, updatedAt: new Date().toISOString() };
	profile.lastname = { value: lastname, updatedAt: new Date().toISOString() };

	await user.updateProfile(profile);

	// create congregation
	const congRequest = congsList.at(0)! as ApiCongregationSearchResponse;

	const congId = await CongregationsList.create({
		cong_name,
		cong_number,
		country_code,
		cong_circuit: congRequest.circuit,
		cong_location: { address: congRequest.address, lat: congRequest.location.lat, lng: congRequest.location.lng },
		midweek_meeting: {
			time: congRequest.midweekMeetingTime.time.slice(0, -3),
			weekday: congRequest.midweekMeetingTime.weekday,
		},
		weekend_meeting: {
			time: congRequest.weekendMeetingTime.time.slice(0, -3),
			weekday: congRequest.weekendMeetingTime.weekday,
		},
	});

	// add user to congregation
	const userCong = await user.assignCongregation({ congId: congId, role: ['admin'] });

	if (MAIL_ENABLED) {
		req.i18n.changeLanguage(language);

		const options = {
			to: user.email,
			subject: req.t('tr_welcomeTitle'),
			template: 'welcome',
			context: {
				welcomeTitle: req.t('tr_welcomeTitle'),
				welcomeDesc: req.t('tr_welcomeDesc'),
				watchVideoLabel: req.t('tr_watchVideoLabel'),
				moreInfoTitle: req.t('tr_moreInfoTitle'),
				moreInfoGuideLabel: req.t('tr_moreInfoGuideLabel'),
				moreInfoBlogLabel: req.t('tr_moreInfoBlogLabel'),
				moreInfoSupportLabel: req.t('tr_moreInfoSupportLabel'),
				copyright: new Date().getFullYear(),
			},
		};

		MailClient.sendEmail(options, 'Welcome message sent to user');
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

	if (!id) {
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

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return;
	}

	const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const user = res.locals.currentUser;

	const roles = user.profile.congregation!.cong_role;

	const adminRole = roles.includes('admin');
	const coordinatorRole = roles.includes('coordinator');
	const secretaryRole = roles.includes('secretary');
	const serviceRole = roles.includes('service_overseer');

	const committeeRole = adminRole || coordinatorRole || secretaryRole || serviceRole;

	if (!committeeRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to process this application';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const application = req.body.application as StandardRecord;

	await cong.saveApplication(application);

	const result = cong.ap_applications;

	res.locals.type = 'info';
	res.locals.message = 'user updated application approval';
	res.status(200).json(result);
};

export const deleteApplication = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id) {
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

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return;
	}

	const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const user = res.locals.currentUser;

	const roles = user.profile.congregation!.cong_role;

	const adminRole = roles.includes('admin');
	const coordinatorRole = roles.includes('coordinator');
	const secretaryRole = roles.includes('secretary');
	const serviceRole = roles.includes('service_overseer');

	const committeeRole = adminRole || coordinatorRole || secretaryRole || serviceRole;

	if (!committeeRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to process this application';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const result = await cong.deleteApplication(request);

	res.locals.type = 'info';
	res.locals.message = 'user deleted application';
	res.status(200).json(result);
};
