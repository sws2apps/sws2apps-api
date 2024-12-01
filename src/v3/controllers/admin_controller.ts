import { Request, Response } from 'express';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';

export const validateAdmin = async (req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged in';
	res.status(200).json({ message: 'OK' });
};

export const logoutAdmin = async (req: Request, res: Response) => {
	// remove all sessions
	const { id } = res.locals.currentUser;
	const admin = UsersList.findById(id);

	if (admin) await admin.adminLogout();

	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged out';
	res.status(200).json({ message: 'LOGGED_OUT' });
};

export const getAllCongregations = async (req: Request, res: Response) => {
	const congsList = CongregationsList.list;

	const result = congsList.map((cong) => {
		return {
			id: cong.id,
			country_code: cong.settings.country_code,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			cong_members: cong.members.map((user) => {
				return { ...user.profile, id: user.id };
			}),
		};
	});

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all congregation';
	res.status(200).json(result);
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	if (cong.members.length > 0) {
		res.locals.type = 'warn';
		res.locals.message = 'congregation could not be deleted since there are still users inside';
		res.status(405).json({ message: 'CONG_ACTIVE' });
		return;
	}

	await CongregationsList.delete(id);

	res.locals.type = 'info';
	res.locals.message = 'congregation deleted';
	res.status(200).json({ message: 'OK' });
};
