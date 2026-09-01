import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import type { FeatureFlag } from '#modules/feature-flags/index.js';
import {
	AdministrationFlagError,
	createAdministrationFlag,
	deleteAdministrationFlag,
	getAdministrationFlags,
	toggleAdministrationFlag,
	toggleCongregationFlag,
	toggleUserFlag,
	updateAdministrationFlag,
} from './administration-flags.service.js';

const handleAdministrationFlagError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof AdministrationFlagError)) return false;

	if (error.code === 'USER_NOT_FOUND') {
		sendClientError(res, 404, 'USER_NOT_FOUND', 'no user could not be found with the provided id');
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'CONG_NOT_FOUND', 'no congregation could not be found with the provided id');
		return true;
	}

	sendClientError(res, 404, 'FLAG_NOT_FOUND', 'no flag could not be found with the provided id');
	return true;
};

export const flagsGet = async (_req: Request, res: Response) => {
	const result = getAdministrationFlags();

	sendSuccess(res, result, 'admin fetched all feature flags');
};

export const flagsCreate = async (req: Request, res: Response) => {
	const name = req.body.name as string;
	const description = req.body.desc as string;
	const availability = req.body.availability as FeatureFlag['availability'];
	const result = await createAdministrationFlag(name, description, availability);

	sendSuccess(res, result, 'admin created new feature flag');
};

export const flagDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the flag request id params is undefined');
		return;
	}

	const result = await deleteAdministrationFlag(id);

	sendSuccess(res, result, 'admin deleted a feature flag');
};

export const flagUpdate = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the flag request id params is undefined');
		return;
	}

	const result = await updateAdministrationFlag(
		id,
		req.body.name as string,
		req.body.description as string,
		req.body.coverage as number,
	);

	if (!result) {
		sendClientError(res, 404, 'FLAG_NOT_FOUND', 'no flag could not be found with the provided id');
		return;
	}

	sendSuccess(res, result, 'admin updated a feature flag');
};

export const flagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the flag request id params is undefined');
		return;
	}

	const result = await toggleAdministrationFlag(id);
	if (!result) {
		sendClientError(res, 404, 'FLAG_NOT_FOUND', 'no flag could not be found with the provided id');
		return;
	}

	sendSuccess(res, result, 'admin updated feature flag status');
};

export const userFlagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');
		return;
	}

	let result;
	try {
		result = await toggleUserFlag(id, req.body.flagid as string);
	} catch (error) {
		if (!handleAdministrationFlagError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin updated user feature toggle');
};

export const congregationFlagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');
		return;
	}

	let result;
	try {
		result = await toggleCongregationFlag(id, req.body.flagid as string);
	} catch (error) {
		if (!handleAdministrationFlagError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin updated congregation feature toggle');
};
