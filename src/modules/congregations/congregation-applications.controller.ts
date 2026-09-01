import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import {
	CongregationApplicationError,
	deleteCongregationApplication,
	updateCongregationApplication,
} from './congregation-applications.service.js';

const handleCongregationApplicationError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationApplicationError)) return false;

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'error_app_congregation_not-found', 'no congregation could not be found with the provided id');
		return true;
	}

	const logMessage = error.code === 'MEMBERSHIP_REQUIRED'
		? 'user not authorized to access the provided congregation'
		: 'user not authorized to process this application';
	sendClientError(res, 403, 'error_api_unauthorized-request', logMessage);
	return true;
};

export const updateApplicationApproval = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the congregation request id params is undefined');
		return;
	}

	if (!request) {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the application request id params is undefined');
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

	sendSuccess(res, result, 'user updated application approval');
};

export const deleteApplication = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the congregation request id params is undefined');
		return;
	}

	if (!request) {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the application request id params is undefined');
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

	sendSuccess(res, result, 'user deleted application');
};
