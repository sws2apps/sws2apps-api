import type { Request, Response } from 'express';

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

