import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

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
} from '../services/administration-users.service.js';

const handleAdministrationUserError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof AdministrationUserError)) return false;

	if (error.code === 'USER_NOT_FOUND') {
		sendClientError(res, 404, 'USER_NOT_FOUND', 'no user could not be found with the provided id');
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'CONG_NOT_FOUND', 'no congregation could not found with the provided id');
		return true;
	}

	sendClientError(res, 400, 'USER_MEMBER_ALREADY', 'user already member of the congregation');
	return true;
};

export const usersGetAll = async (req: Request, res: Response) => {
	const result = getAdministrationUsers(req.signedCookies.visitorid);

	sendSuccess(res, result, 'admin fetched all users');
};

export const userDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

		return;
	}

	let result;
	try {
		result = await deleteAdministrationUser(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin deleted an user');
};

export const userDisable2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

		return;
	}

	let result;
	try {
		result = await disableAdministrationUserMfa(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin disabled user 2fa');
};

export const userRevokeToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

		return;
	}

	let result;
	try {
		result = await revokeAdministrationUserToken(id, req.signedCookies.visitorid);
	} catch (error) {
		if (!handleAdministrationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'admin revoked user token');
};

export const userUpdate = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

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

	sendSuccess(res, result, 'admin updated user details');
};

export const userSessionDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

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

	sendSuccess(res, result, 'admin revoked an user session');
};

export const userAssignCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

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

	sendSuccess(res, result, 'admin assigned an user to a congregation');
};

export const userRemoveCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'REQUEST_ID_INVALID', 'the user request id params is undefined');

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

	sendSuccess(res, result, 'admin removed a user from a congregation');
};
