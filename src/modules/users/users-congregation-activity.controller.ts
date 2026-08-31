import type { Request, Response } from 'express';

import type { StandardRecord } from '../../types/standard-record.js';
import {
	getUserAuxiliaryApplications,
	getUserCongregationUpdates,
	requestCongregationMembership,
	submitUserAuxiliaryApplication,
	submitUserFeedback,
	submitUserFieldServiceReport,
	UserCongregationActivityError,
} from './users-congregation-activity.service.js';

const handleUserCongregationActivityError = (
	error: unknown,
	res: Response,
): boolean => {
	if (!(error instanceof UserCongregationActivityError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		res.locals.message = 'user does not have an assigned congregation';
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });
		return true;
	}

	res.locals.message = 'user congregation is invalid';
	res.status(404).json({ message: 'error_app_congregation_not-found' });
	return true;
};

export const getAuxiliaryApplications = async (req: Request, res: Response) => {
	const { id } = req.params;

	let results;

	try {
		results = getUserAuxiliaryApplications(id);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitAuxiliaryApplication = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		submitUserAuxiliaryApplication(id, req.body.application as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user submitted auxiliary pioneer application`;
	res.status(200).json({ message: 'APPLICATION_SENT' });
};

export const postUserReport = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		submitUserFieldServiceReport(id, req.body.report as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const getUserUpdates = async (req: Request, res: Response) => {
	const { id } = req.params;

	let result;

	try {
		result = await getUserCongregationUpdates(id);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		res.status(403).json({
			message: error.code === 'CONGREGATION_NOT_ASSIGNED'
				? 'CONG_NOT_ASSIGNED'
				: 'error_app_congregation_not-found',
		});
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve updates successfully';
	res.status(200).json(result);
};

export const userPostFeedback = async (req: Request, res: Response) => {
	const { id } = req.params;
	const { subject, message } = req.body;

	try {
		submitUserFeedback(id, subject as string, message as string);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		res.status(403).json({
			message: error.code === 'CONGREGATION_NOT_ASSIGNED'
				? 'CONG_NOT_ASSIGNED'
				: 'error_app_congregation_not-found',
		});
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user sent feedback successfully';
	res.status(200).json({ message: 'MESSAGE_SENT' });
};

export const joinCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	const outcome = await requestCongregationMembership(id, {
		countryCode: req.body.country_code as string,
		congregationName: req.body.cong_name as string,
		firstname: req.body.firstname as string,
		lastname: (req.body.lastname || '') as string,
	});

	if (outcome === 'already_member') {
		res.locals.type = 'warn';
		res.locals.message = `user already member of the congregation`;
		res.status(400).json({ message: 'ALREADY_MEMBER' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user request to join a congregation`;
	res.status(200).json({ message: 'REQUEST_SENT' });
};


