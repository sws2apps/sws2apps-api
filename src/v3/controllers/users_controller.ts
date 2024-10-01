import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { generateTokenDev } from '../dev/setup.js';
import { formatError } from '../utils/format_log.js';
import { StandardRecord } from '../definition/app.js';

const isDev = process.env.NODE_ENV === 'development';

export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = res.locals.currentUser;

		if (!user.profile.congregation) {
			res.locals.type = 'warn';
			res.locals.message = 'email address not associated with a congregation';
			res.status(404).json({ message: 'CONG_NOT_FOUND' });
			return;
		}

		const cong = CongregationsList.findById(user.profile.congregation.id)!;

		const obj = {
			id: user.id,
			cong_id: cong.id,
			country_code: cong.settings.country_code,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			cong_role: user.profile.congregation.cong_role,
			user_local_uid: user.profile.congregation.user_local_uid,
			user_delegates: user.profile.congregation.user_members_delegate,
			cong_master_key: cong.settings.cong_master_key,
			cong_access_code: cong.settings.cong_access_code,
		};

		res.locals.type = 'info';
		res.locals.message = 'visitor id has been validated';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};

export const getUserSecretToken = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });

			return;
		}

		const user = UsersList.findById(id)!;
		await user.generateSecret();
		const { secret, uri } = user.decryptSecret();

		res.locals.type = 'info';
		res.locals.message = `the user has fetched 2fa successfully`;

		if (!user.profile.mfa_enabled && isDev) {
			const tokenDev = generateTokenDev(user.profile.email!, user.profile.secret!);
			res.status(200).json({ secret: secret, qrCode: uri, mfaEnabled: user.profile.mfa_enabled, MFA_CODE: tokenDev });
		} else {
			res.status(200).json({
				secret: secret,
				qrCode: uri,
				mfaEnabled: user.profile.mfa_enabled,
			});
		}
	} catch (err) {
		next(err);
	}
};

export const getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}

		const user = UsersList.findById(id)!;
		const sessions = user.getActiveSessions(req.signedCookies.visitorid);

		res.locals.type = 'info';
		res.locals.message = `the user has fetched sessions successfully`;
		res.status(200).json(sessions);
	} catch (err) {
		next(err);
	}
};

export const deleteUserSession = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user and session id are required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const identifier = req.body.identifier as string;

		const user = UsersList.findById(id)!;
		const sessions = await user.revokeSession(identifier);

		if (user.profile.congregation && user.profile.congregation.id.length > 0) {
			const cong = CongregationsList.findById(user.profile.congregation.id);

			if (cong) {
				cong.reloadMembers();
			}
		}

		res.locals.type = 'info';
		res.locals.message = `the user has revoked session successfully`;
		res.status(200).json(sessions);
	} catch (err) {
		next(err);
	}
};

export const userLogout = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const visitorid = req.headers.visitorid as string;

		const user = res.locals.currentUser;

		if (user) {
			await user.revokeSession(visitorid);
		}

		res.locals.type = 'info';
		res.locals.message = `the current user has logged out`;

		res.clearCookie('visitorid', { path: '/' });
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const disableUser2FA = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });

			return;
		}

		const user = UsersList.findById(id)!;
		await user.disableMFA();

		res.locals.type = 'info';
		res.locals.message = `the user disabled 2fa successfully`;
		res.status(200).json({ message: 'MFA_DISABLED' });
	} catch (err) {
		next(err);
	}
};

export const getAuxiliaryApplications = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });

			return;
		}

		const user = UsersList.findById(id)!;

		if (!user.profile.congregation) {
			res.locals.type = 'warn';
			res.locals.message = `user does not have an assigned congregation`;
			res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

			return;
		}

		const cong = CongregationsList.findById(user.profile.congregation?.id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'user congregation is invalid';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const results = user.getApplications();

		res.locals.type = 'info';
		res.locals.message = `user get submitted auxiliary pioneer application list`;
		res.status(200).json(results);
	} catch (err) {
		next(err);
	}
};

export const submitAuxiliaryApplication = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });

			return;
		}

		const user = UsersList.findById(id)!;

		if (!user.profile.congregation) {
			res.locals.type = 'warn';
			res.locals.message = `user does not have an assigned congregation`;
			res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

			return;
		}

		const cong = CongregationsList.findById(user.profile.congregation?.id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'user congregation is invalid';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const form = req.body.application as StandardRecord;

		const application = {
			request_id: crypto.randomUUID().toUpperCase(),
			person_uid: user.profile.congregation.user_local_uid,
			months: form.months,
			continuous: form.continuous,
			submitted: form.submitted,
			updatedAt: new Date().toISOString(),
			expired: null,
		};

		cong.saveApplication(application);

		res.locals.type = 'info';
		res.locals.message = `user submitted auxiliary pioneer application`;
		res.status(200).json({ message: 'APPLICATION_SENT' });
	} catch (err) {
		next(err);
	}
};
