import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

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
} from '../services/administration-congregations.service.js';

const handleAdministrationCongregationError = (
	error: unknown,
	res: Response,
	notFoundCode = 'CONGREGATION_NOT_FOUND',
): boolean => {
	if (!(error instanceof AdministrationCongregationError)) return false;

	if (error.code === 'CONGREGATION_ACTIVE') {
		sendClientError(res, 405, 'CONG_ACTIVE', 'congregation could not be deleted since there are still users inside');
		return true;
	}

	if (error.code === 'CONGREGATION_EXISTS') {
		sendClientError(res, 400, 'CONG_EXISTS', 'custom congregation already exists');
		return true;
	}

	if (error.code === 'COUNTRY_FETCH_FAILED') {
		sendClientError(res, error.statusCode!, 'FETCH_FAILED', 'an error occured while getting list of all countries');
		return true;
	}

	sendClientError(res, 404, notFoundCode, 'no congregation could not be found with the provided id');
	return true;
};

export const getAllCongregations = async (req: Request, res: Response) => {
	const result = await getAdministrationCongregations();

	sendSuccess(res, result, 'admin fetched all congregation');
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the congregation request id params is undefined');

		return;
	}

	let result;
	try {
		result = await deleteAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin deleted a congregation');
};

export const congregationGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	let result;
	try {
		result = getAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'error_app_congregation_not-found')) throw error;
		return;
	}

	sendSuccess(res, result, 'admin fetched a congergation');
};

export const congregationDataSyncToggle = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the congregation request id params is undefined');

		return;
	}

	let result;
	try {
		result = await toggleAdministrationCongregationDataSync(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	sendSuccess(res, result, `admin updated congregation data sync`);
};

export const createCongregation = async (req: Request, res: Response) => {
	const { country, name } = req.body as Record<string, string>;

	let result;
	try {
		result = await createAdministrationCongregation(country, name);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin created a custom congregation');
};

export const congregationDeleteRequest = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined' || !request || request === 'undefined') {
		sendClientError(res, 400, 'CONG_REQUEST_ID_INVALID', 'the congregation or request id params are undefined');

		return;
	}

	let result;
	try {
		result = await deleteAdministrationSpeakerAccessRequest(id, request);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	sendSuccess(res, result, `admin deleted congregation access request`);
};

export const congregationResetSpeakersKey = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation or request id params are undefined');

		return;
	}

	let result;
	try {
		result = await resetAdministrationSpeakersKey(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	sendSuccess(res, result, `admin reset the congregation speakers key`);
};

export const updateBasicCongregationInfo = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the congregation request id params is undefined');

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

	sendSuccess(res, result, 'admin updated basic congregation information');
};
