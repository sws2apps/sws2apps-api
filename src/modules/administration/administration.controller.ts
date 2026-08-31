import { Request, Response } from 'express';
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
} from './administration-congregations.service.js';
import {
	AdministrationUserError,
	assignAdministrationUserCongregation,
	deleteAdministrationUser,
	disableAdministrationUserMfa,
	getAdministrationUsers,
	logoutAdministrationUser,
	removeAdministrationUserCongregation,
	revokeAdministrationUserSession,
	revokeAdministrationUserToken,
	updateAdministrationUser,
} from './administration-users.service.js';
import { rejectInvalidRequest } from '../../http/validation-errors.js';
import type { AppRoleType } from '../../domain/users/app-role.js';

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

const handleAdministrationCongregationError = (
	error: unknown,
	res: Response,
	notFoundCode = 'CONGREGATION_NOT_FOUND',
): boolean => {
	if (!(error instanceof AdministrationCongregationError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_ACTIVE') {
		res.locals.message = 'congregation could not be deleted since there are still users inside';
		res.status(405).json({ message: 'CONG_ACTIVE' });
		return true;
	}

	if (error.code === 'CONGREGATION_EXISTS') {
		res.locals.message = 'custom congregation already exists';
		res.status(400).json({ message: 'CONG_EXISTS' });
		return true;
	}

	if (error.code === 'COUNTRY_FETCH_FAILED') {
		res.locals.message = 'an error occured while getting list of all countries';
		res.status(error.statusCode!).json({ message: 'FETCH_FAILED' });
		return true;
	}

	res.locals.message = 'no congregation could not be found with the provided id';
	res.status(404).json({ message: notFoundCode });
	return true;
};


export const validateAdmin = async (req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged in';
	res.status(200).json({ message: 'OK' });
};

export const logoutAdmin = async (req: Request, res: Response) => {
	// remove all sessions
	const { id } = res.locals.currentUser;
	await logoutAdministrationUser(id);

	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged out';

	res.clearCookie('visitorid');
	res.status(200).json({ message: 'LOGGED_OUT' });
};

export const getAllCongregations = async (req: Request, res: Response) => {
	const result = await getAdministrationCongregations();

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all congregation';
	res.status(200).json(result);
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await deleteAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin deleted a congregation';
	res.status(200).json(result);
};

export const congregationGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let result;
	try {
		result = getAdministrationCongregation(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'error_app_congregation_not-found')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin fetched a congergation';
	res.status(200).json(result);
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
	if (rejectInvalidRequest(req, res)) return;

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


export const congregationDataSyncToggle = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await toggleAdministrationCongregationDataSync(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin updated congregation data sync`;
	res.status(200).json(result);
};

export const createCongregation = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { country, name } = req.body as Record<string, string>;

	let result;
	try {
		result = await createAdministrationCongregation(country, name);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin created a custom congregation';
	res.status(200).json(result);
};

export const userAssignCongregation = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

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

export const congregationDeleteRequest = async (req: Request, res: Response) => {
	const { id, request } = req.params;

	if (!id || id === 'undefined' || !request || request === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation or request id params are undefined';
		res.status(400).json({ message: 'CONG_REQUEST_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await deleteAdministrationSpeakerAccessRequest(id, request);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin deleted congregation access request`;
	res.status(200).json(result);
};

export const congregationResetSpeakersKey = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation or request id params are undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	let result;
	try {
		result = await resetAdministrationSpeakersKey(id);
	} catch (error) {
		if (!handleAdministrationCongregationError(error, res, 'CONG_NOT_FOUND')) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `admin reset the congregation speakers key`;
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

export const updateBasicCongregationInfo = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

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

	res.locals.type = 'info';
	res.locals.message = 'admin updated basic congregation information';
	res.status(200).json(result);
};
