import { Request, Response } from 'express';
import { rejectInvalidRequest } from '../../http/validation-errors.js';
import {
	getAvailableCountries,
	searchCongregationDirectory,
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
import {
	CongregationCreationError,
	createVerifiedCongregation,
} from './congregation-creation.service.js';

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
	if (rejectInvalidRequest(req, res)) return;

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
	if (rejectInvalidRequest(req, res)) return;

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
	if (rejectInvalidRequest(req, res)) return;

	const { country_code, country_guid, cong_name, firstname, lastname } = req.body as Record<string, string>;
	const language = (req.headers.language as string) || 'eng';
	let creation;

	try {
		creation = await createVerifiedCongregation({
			userId: res.locals.currentUser.id,
			countryCode: country_code,
			countryGuid: country_guid,
			congregationName: cong_name,
			firstname,
			lastname,
			language,
		});
	} catch (error) {
		if (!(error instanceof CongregationCreationError)) throw error;

		res.locals.type = 'warn';
		if (error.code === 'CONGREGATION_EXISTS') {
			res.locals.message = 'the congregation requested already exists';
			res.status(404).json({ message: 'CONG_EXISTS' });
		} else if (error.code === 'DIRECTORY_FETCH_FAILED') {
			res.locals.message = 'an error occured while verifying the congregation data';
			res.status(error.statusCode!).json({ message: 'REQUEST_NOT_VALIDATED' });
		} else {
			res.locals.message = 'this request does not match any valid congregation';
			res.status(400).json({ message: 'BAD_REQUEST' });
		}
		return;
	}

	if (isWelcomeEmailEnabled()) {
		req.i18n.changeLanguage(language);

		sendWelcomeEmail({
			recipient: creation.notificationRecipient,
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

	res.locals.type = 'info';
	res.locals.message = 'congregation created successfully';
	res.status(200).json(creation.response);
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
