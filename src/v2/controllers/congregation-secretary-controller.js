import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';

export const getPendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregation pending field service reports';
		res.status(200).json(cong.cong_pending_fieldServiceReports);
	} catch (err) {
		next(err);
	}
};

export const approvePendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const { user_local_uid, month } = req.body;

		cong.removePendingFieldServiceReports(user_local_uid, month);

		const user = users.findUserByLocalUid(user_local_uid);
		await user.approveFieldServiceReports(month);

		res.locals.type = 'info';
		res.locals.message = 'user approved pending field service reports';
		res.status(200).json({ message: 'S4_REPORT_APPROVED' });
	} catch (err) {
		next(err);
	}
};

export const disapprovePendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const { user_local_uid, month } = req.body;

		cong.removePendingFieldServiceReports(user_local_uid, month);

		const user = users.findUserByLocalUid(user_local_uid);
		await user.disapproveFieldServiceReports(month);

		res.locals.type = 'info';
		res.locals.message = 'user disapproved pending field service reports';
		res.status(200).json({ message: 'S4_REPORT_DISAPPROVED' });
	} catch (err) {
		next(err);
	}
};
