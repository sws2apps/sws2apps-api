import type { Request, Response } from 'express';

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
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin fetched all users';
	res.status(200).json(congregationMembers);
};

export const userDetailsUpdate = async (req: Request, res: Response) => {
	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin updated user details';
	res.status(200).json(congregationMembers);
};

export const globalSearchUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin got global user';
	res.status(200).json(foundUser);
};

export const congregationUserAdd = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin added vip user';
	res.status(200).json(congregationMembers);
};

export const congregationDeleteUser = async (req: Request, res: Response) => {
	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin removed user from congregation';
	res.status(200).json(congregationMembers);
};

export const setAdminUserUid = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

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

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set his user uid';
	res.status(200).json({ message: 'USER_UID_SET' });
};


