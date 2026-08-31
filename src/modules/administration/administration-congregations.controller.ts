import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
import {
	AdministrationCongregationError,
	createAdministrationCongregation,
	deleteAdministrationCongregation,
	deleteAdministrationSpeakerAccessRequest,
	getAdministrationCongregation,
	getAdministrationCongregations,
	resetAdministrationSpeakersKey,
	toggleAdministrationCongregationDataSync,
	updateAdministrationCongregation,
} from './administration-congregations.service.js';

const handleAdministrationCongregationError = (
	error: unknown,
	res: Response,
	notFoundCode = 'CONGREGATION_NOT_FOUND',
): boolean => {
	if (!(error instanceof AdministrationCongregationError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_ACTIVE') {
		res.locals.message = 'congregation could not be deleted since there are still users inside';
		res.status(405).json({ message: 'CONG_ACTIVE' });
		return true;
	}

	if (error.code === 'CONGREGATION_EXISTS') {
		res.locals.message = 'custom congregation already exists';
		res.status(400).json({ message: 'CONG_EXISTS' });
		return true;
	}

	if (error.code === 'COUNTRY_FETCH_FAILED') {
		res.locals.message = 'an error occured while getting list of all countries';
		res.status(error.statusCode!).json({ message: 'FETCH_FAILED' });
		return true;
	}

	res.locals.message = 'no congregation could not be found with the provided id';
	res.status(404).json({ message: notFoundCode });
	return true;
};

export const getAllCongregations = async (req: Request, res: Response) => {
	const result = await getAdministrationCongregations();

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all congregation';
	res.status(200).json(result);
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await deleteAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin deleted a congregation';
	res.status(200).json(result);
};

export const congregationGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let result;
	try {
		result = getAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'error_app_congregation_not-found')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin fetched a congergation';
	res.status(200).json(result);
};

export const congregationDataSyncToggle = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await toggleAdministrationCongregationDataSync(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin updated congregation data sync`;
	res.status(200).json(result);
};

export const createCongregation = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { country, name } = req.body as Record<string, string>;

	let result;
	try {
		result = await createAdministrationCongregation(country, name);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin created a custom congregation';
	res.status(200).json(result);
};

export const congregationDeleteRequest = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined' || !request || request === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation or request id params are undefined';
		res.status(400).json({ message: 'CONG_REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await deleteAdministrationSpeakerAccessRequest(id, request);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin deleted congregation access request`;
	res.status(200).json(result);
};

export const congregationResetSpeakersKey = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation or request id params are undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await resetAdministrationSpeakersKey(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin reset the congregation speakers key`;
	res.status(200).json(result);
};

export const updateBasicCongregationInfo = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const congNameNew = req.body.name as string;
	const congNumberNew = req.body.number as string;
	const congGuidNew = req.body.guid as string;
	let result;
	try {
		result = await updateAdministrationCongregation(id, {
			name: congNameNew,
			number: congNumberNew,
			guid: congGuidNew,
		});
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated basic congregation information';
	res.status(200).json(result);
};

