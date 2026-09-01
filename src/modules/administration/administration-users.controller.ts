import type { Request, Response } from 'express';

import type { AppRoleType } from '#domain/users/app-role.js';
import {
	AdministrationUserError,
	assignAdministrationUserCongregation,
	deleteAdministrationUser,
	disableAdministrationUserMfa,
	getAdministrationUsers,
	removeAdministrationUserCongregation,
	revokeAdministrationUserSession,
	revokeAdministrationUserToken,
	updateAdministrationUser,
} from './administration-users.service.js';

const handleAdministrationUserError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof AdministrationUserError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'USER_NOT_FOUND') {
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not found with the provided id';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
		return true;
	}

	res.locals.message = 'user already member of the congregation';
	res.status(400).json({ message: 'USER_MEMBER_ALREADY' });
	return true;
};

export const usersGetAll = async (req: Request, res: Response) => {
	const result = getAdministrationUsers(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all users';
	res.status(200).json(result);
};

export const userDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await deleteAdministrationUser(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin deleted an user';
	res.status(200).json(result);
};

export const userDisable2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await disableAdministrationUserMfa(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin disabled user 2fa';
	res.status(200).json(result);
};

export const userRevokeToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await revokeAdministrationUserToken(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin revoked user token';
	res.status(200).json(result);
};

export const userUpdate = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const lastname = req.body.lastname as string;
	const firstname = req.body.firstname as string;
	const email = req.body.email as string;
	const roles = req.body.roles as AppRoleType[];

	let result;
	try {
		result = await updateAdministrationUser(
			id,
			{ firstname, lastname, email, roles },
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated user details';
	res.status(200).json(result);
};

export const userSessionDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const identifiers = req.body.identifiers as string | [];
	let result;
	try {
		result = await revokeAdministrationUserSession(
			id,
			identifiers,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin revoked an user session';
	res.status(200).json(result);
};

export const userAssignCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await assignAdministrationUserCongregation(
			id,
			req.body.congregation as string,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin assigned an user to a congregation';
	res.status(200).json(result);
};

export const userRemoveCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await removeAdministrationUserCongregation(
			id,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin removed a user from a congregation';
	res.status(200).json(result);
};

