import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { generateTokenDev } from '../dev/setup.js';
import { fetchCrowdinAnnouncements } from '../services/crowdin/announcement.js';
import { formatError } from '../utils/format_log.js';

const isDev = process.env.NODE_ENV === 'development';

export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await UsersList.findByAuthUid(res.locals.currentUser.auth_uid)!;

		if (!user.cong_id) {
			res.locals.type = 'warn';
			res.locals.message = 'email address not associated with a congregation';
			res.status(404).json({ message: 'CONG_NOT_FOUND' });
			return;
		}

		const cong = CongregationsList.findById(user.cong_id)!;

		const obj = {
			id: user.id,
			cong_id: user.cong_id,
			country_code: cong.country_code,
			cong_name: user.cong_name,
			cong_number: user.cong_number,
			cong_role: user.cong_role,
			user_local_uid: user.user_local_uid,
			user_delegates: user.user_delegates,
			firstname: user.firstname,
			lastname: user.lastname,
			cong_master_key: cong.cong_master_key,
			cong_access_code: cong.cong_access_code,
			mfaEnabled: user.mfaEnabled,
			cong_circuit: cong.cong_circuit,
			cong_location: cong.cong_location,
			midweek_meeting: cong.midweek_meeting,
			weekend_meeting: cong.weekend_meeting,
			cong_last_backup: cong.last_backup,
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

		if (!user.mfaEnabled && isDev) {
			const tokenDev = generateTokenDev(user.user_email!, user.secret!);
			res.status(200).json({ secret: secret, qrCode: uri, mfaEnabled: user.mfaEnabled, MFA_CODE: tokenDev });
		} else {
			res.status(200).json({
				secret: secret,
				qrCode: uri,
				mfaEnabled: user.mfaEnabled,
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

		if (user.cong_id?.length! > 0) {
			const cong = CongregationsList.findById(user.cong_id!);
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

		const user = UsersList.findByAuthUid(res.locals.currentUser.auth_uid);

		if (user) {
			await user.revokeSession(visitorid);
		}

		res.locals.type = 'info';
		res.locals.message = `the current user has logged out`;
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

export const getAnnouncementsV2 = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const cong_role = req.headers.cong_role as string;

		const list = await fetchCrowdinAnnouncements(cong_role);

		res.locals.type = 'info';
		res.locals.message = `client fetched announcements`;
		res.status(200).json(list);
	} catch (err) {
		next(err);
	}
};
