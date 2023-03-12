import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';

export const validateAdmin = async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged in';

		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const logoutAdmin = async (req, res, next) => {
	try {
		// remove all sessions
		const { id } = res.locals.currentUser;
		const admin = users.findUserById(id);

		await admin.adminLogout();

		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged out';
		res.status(200).json({ message: 'LOGGED_OUT' });
	} catch (err) {
		next(err);
	}
};

export const getBlockedRequests = async (req, res, next) => {
	try {
		let reqs = [];
		// eslint-disable-next-line no-undef
		for (let i = 0; i < requestTracker.length; i++) {
			// eslint-disable-next-line no-undef
			const retryOn = requestTracker[i].retryOn || 0;
			if (retryOn > 0) {
				const currentDate = new Date().getTime();
				if (currentDate < retryOn) {
					// eslint-disable-next-line no-undef
					reqs.push(requestTracker[i]);
				}
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'admin fetched blocked requests';
		res.status(200).json({ message: reqs });
	} catch (err) {
		next(err);
	}
};

export const unblockRequest = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		// eslint-disable-next-line no-undef
		const ipIndex = requestTracker.findIndex((client) => client.ip === req.body.request_ip);

		if (ipIndex === -1) {
			res.locals.type = 'warn';
			res.locals.message = 'failed to unblock request since ip is not valid';
			res.status(400).json({ message: 'UNBLOCK_FAILED' });
		} else {
			// eslint-disable-next-line no-undef
			requestTracker.splice(ipIndex, 1);
			res.locals.type = 'info';
			res.locals.message = 'request unblocked successfully';
			// eslint-disable-next-line no-undef
			res.status(200).json({ message: requestTracker });
		}
	} catch (err) {
		next(err);
	}
};

export const getAdminDashboard = async (req, res, next) => {
	try {
		const congsList = congregations.list;
		const usersList = users.list;

		const obj = {
			users: {
				total: usersList.length,
				active: usersList.filter((user) => user.mfaEnabled === true).length,
				mfaPending: usersList.filter((user) => user.emailVerified === true && user.mfaEnabled === false).length,
				unverified: usersList.filter((user) => user.emailVerified === false).length,
				pockets: usersList.filter((user) => user.global_role === 'pocket').length,
			},
			congregations: {
				active: congsList.length,
			},
		};

		res.locals.type = 'info';
		res.locals.message = 'admin fetched dashboard';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};
