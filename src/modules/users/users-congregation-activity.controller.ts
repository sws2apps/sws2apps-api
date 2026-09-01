import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

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

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		sendClientError(res, 400, 'CONG_NOT_ASSIGNED', 'user does not have an assigned congregation');
		return true;
	}

	sendClientError(res, 404, 'error_app_congregation_not-found', 'user congregation is invalid');
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

	sendSuccess(res, results, `user get submitted auxiliary pioneer application list`);
};

export const submitAuxiliaryApplication = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		submitUserAuxiliaryApplication(id, req.body.application as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'APPLICATION_SENT' }, `user submitted auxiliary pioneer application`);
};

export const postUserReport = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		submitUserFieldServiceReport(id, req.body.report as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'REPORT_SENT' }, `user sent report successfully`);
};

export const getUserUpdates = async (req: Request, res: Response) => {
	const { id } = req.params;

	let result;

	try {
		result = await getUserCongregationUpdates(id);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		const congregationNotAssigned = error.code === 'CONGREGATION_NOT_ASSIGNED';
		const logMessage = congregationNotAssigned
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		const publicMessage = congregationNotAssigned
			? 'CONG_NOT_ASSIGNED'
			: 'error_app_congregation_not-found';
		sendClientError(res, 403, publicMessage, logMessage);
		return;
	}

	sendSuccess(res, result, 'user retrieve updates successfully');
};

export const userPostFeedback = async (req: Request, res: Response) => {
	const { id } = req.params;
	const { subject, message } = req.body;

	try {
		submitUserFeedback(id, subject as string, message as string);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		const congregationNotAssigned = error.code === 'CONGREGATION_NOT_ASSIGNED';
		const logMessage = congregationNotAssigned
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		const publicMessage = congregationNotAssigned
			? 'CONG_NOT_ASSIGNED'
			: 'error_app_congregation_not-found';
		sendClientError(res, 403, publicMessage, logMessage);
		return;
	}

	sendSuccess(res, { message: 'MESSAGE_SENT' }, 'user sent feedback successfully');
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
		sendClientError(res, 400, 'ALREADY_MEMBER', `user already member of the congregation`);
		return;
	}

	sendSuccess(res, { message: 'REQUEST_SENT' }, `user request to join a congregation`);
};
