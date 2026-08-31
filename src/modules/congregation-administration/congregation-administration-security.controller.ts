import type { Request, Response } from 'express';

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

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'INVALID_MASTER_KEY') {
		res.locals.message = 'congregation admin provided invalid master key for deletion';
		res.status(403).json({ message: 'error_app_security_invalid-master-key' });
		return true;
	}

	res.locals.message = 'user not authorized to access the provided congregation';
	res.status(403).json({ message: 'error_api_unauthorized-request' });
	return true;
};

export const setCongregationMasterKey = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set master key';
	res.status(200).json({ message: 'MASTER_KEY_SAVED' });
};

export const setCongregationAccessCode = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set password';
	res.status(200).json({ message: 'PASSWORD_SAVED' });
};

export const congregationMasterKeyGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let masterKey;
	try {
		masterKey = getCongregationMasterKey(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin get master key';
	res.status(200).json({ message: masterKey });
};

export const congregationAccessCodeGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let accessCode;
	try {
		accessCode = getCongregationAccessCode(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin get access code';
	res.status(200).json({ message: accessCode });
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin deleted congregation';
	res.status(200).json({ message: 'CONGREGATION_DELETED' });
};


