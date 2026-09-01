import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import {
	CongregationAdministrationSecurityError,
	deleteAuthorizedCongregation,
	getCongregationAccessCode,
	getCongregationMasterKey,
	saveCongregationAccessCode,
	saveCongregationMasterKey,
} from './congregation-administration-security.service.js';

const handleCongregationSecurityError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationAdministrationSecurityError)) return false;

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'error_app_congregation_not-found', 'no congregation could not be found with the provided id');
		return true;
	}

	if (error.code === 'INVALID_MASTER_KEY') {
		sendClientError(res, 403, 'error_app_security_invalid-master-key', 'congregation admin provided invalid master key for deletion');
		return true;
	}

	sendClientError(res, 403, 'error_api_unauthorized-request', 'user not authorized to access the provided congregation');
	return true;
};

export const setCongregationMasterKey = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	try {
		await saveCongregationMasterKey(
			id,
			res.locals.currentUser.id,
			req.body.cong_master_key as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'MASTER_KEY_SAVED' }, 'congregation admin set master key');
};

export const setCongregationAccessCode = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	try {
		await saveCongregationAccessCode(
			id,
			res.locals.currentUser.id,
			req.body.cong_access_code as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'PASSWORD_SAVED' }, 'congregation admin set password');
};

export const congregationMasterKeyGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	let masterKey;
	try {
		masterKey = getCongregationMasterKey(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: masterKey }, 'congregation admin get master key');
};

export const congregationAccessCodeGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	let accessCode;
	try {
		accessCode = getCongregationAccessCode(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: accessCode }, 'congregation admin get access code');
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	try {
		await deleteAuthorizedCongregation(
			id,
			res.locals.currentUser.id,
			req.body.key as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'CONGREGATION_DELETED' }, 'congregation admin deleted congregation');
};
