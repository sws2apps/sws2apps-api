import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import {
	addCongregationUser,
	findEligibleCongregationUser,
	getCongregationMembers,
	removeCongregationUser,
	setCongregationAdministratorPersonUid,
	updateCongregationUser,
} from './congregation-administration-users.service.js';
import { handleCongregationUserError } from './congregation-administration-user-errors.js';

export const congregationGetUsers = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	let congregationMembers;
	try {
		congregationMembers = getCongregationMembers(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, congregationMembers, 'congregation admin fetched all users');
};

export const userDetailsUpdate = async (req: Request, res: Response) => {
	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');

		return;
	}

	if (!user) {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation user params is undefined');

		return;
	}

	const { user_secret_code, cong_role, cong_person_uid, cong_person_delegates, first_name, last_name } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await updateCongregationUser(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
			{
				secretCode: user_secret_code,
				roles: cong_role,
				personUid: cong_person_uid,
				personDelegates: cong_person_delegates,
				firstname: first_name,
				lastname: last_name,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, congregationMembers, 'congregation admin updated user details');
};

export const globalSearchUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');

		return;
	}

	const email = req.query.email as string;
	let foundUser;
	try {
		foundUser = findEligibleCongregationUser(id, res.locals.currentUser.id, email);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, foundUser, 'congregation admin got global user');
};

export const congregationUserAdd = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	const { user_firstname, user_lastname, cong_role, cong_person_uid, user_id } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await addCongregationUser(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
			{
				userId: user_id,
				firstname: user_firstname,
				lastname: user_lastname,
				roles: cong_role,
				personUid: cong_person_uid,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, congregationMembers, 'congregation admin added vip user');
};

export const congregationDeleteUser = async (req: Request, res: Response) => {
	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');

		return;
	}

	if (!user) {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation user params is undefined');

		return;
	}

	let congregationMembers;
	try {
		congregationMembers = await removeCongregationUser(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, congregationMembers, 'congregation admin removed user from congregation');
};

export const setAdminUserUid = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

		return;
	}

	try {
		await setCongregationAdministratorPersonUid(
			id,
			res.locals.currentUser.id,
			req.body.user_uid as string,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	sendSuccess(res, { message: 'USER_UID_SET' }, 'congregation admin set his user uid');
};

