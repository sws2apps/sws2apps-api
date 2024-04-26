import { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { validationResult } from 'express-validator';
import { generateTokenDev } from '../dev/setup.js';
import { UsersList } from '../classes/Users.js';
import { UserSession } from '../denifition/user.js';
import { retrieveVisitorDetails } from '../services/ip_details/auth-utils.js';
import { CongregationsList } from '../classes/Congregations.js';

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userIP = req.clientIp!;
		const isDev = process.env.NODE_ENV === 'development';

		// validate through express middleware
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const visitorid = isNaN(req.body.visitorid) ? req.body.visitorid : +req.body.visitorid;
		const uid = req.headers.uid as string;

		let authUser = UsersList.findByAuthUid(uid);

		let newSessions: UserSession[] = [];

		if (authUser) {
			newSessions = authUser.sessions?.filter((session) => session.visitorid !== visitorid) || [];
		}

		if (!authUser) {
			const userRecord = await getAuth().getUser(uid);
			const displayName = userRecord.displayName || userRecord.providerData[0].displayName;
			let firstname = '';
			let lastname = '';

			if (displayName.length > 0) {
				const names = displayName.split(' ');
				lastname = names.pop()!;
				firstname = names.join(' ');
			}

			authUser = await UsersList.create({ auth_uid: uid, firstname, lastname });
		}

		const newSession: UserSession = {
			mfaVerified: false,
			sws_last_seen: new Date().toISOString(),
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, req),
		};

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.mfaEnabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			if (isDev) {
				const tokenDev = generateTokenDev(authUser.user_email!, authUser.secret!);
				res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
			} else {
				res.status(200).json({ message: 'MFA_VERIFY' });
			}

			return;
		}

		const userInfo = {
			id: authUser.id,
			firstname: authUser.firstname,
			lastname: authUser.lastname,
			cong_name: authUser.cong_name,
			cong_number: authUser.cong_number,
			cong_role: authUser.cong_role,
			cong_id: authUser.cong_id,
			global_role: authUser.global_role,
			user_local_uid: authUser.user_local_uid,
			mfa: 'not_enabled',
			cong_encryption: '',
		};

		if (authUser.cong_id) {
			const userCong = CongregationsList.findById(authUser.cong_id);
			userInfo.cong_encryption = userCong!.cong_encryption;
		}

		res.locals.type = 'info';
		res.locals.message = 'user successfully logged in without MFA';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};

export const createSignInLink = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { email } = req.body;
		const language = (req.headers?.applanguage as string) || 'en';

		const devLink = await UsersList.generatePasswordLessLink({ email, language, origin: req.headers.origin! });

		res.locals.type = 'info';
		res.locals.message = 'passwordless link will be sent to user';
		res.status(200).json(devLink ? { link: devLink } : { message: 'SIGNIN_LINK_SEND' });
	} catch (err) {
		next(err);
	}
};

export const verifyPasswordlessInfo = async (req: Request, res: Response, next: NextFunction) => {
	const userIP = req.clientIp!;
	const isDev = process.env.NODE_ENV === 'development';

	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const uid = req.headers.uid as string;
		const visitorid = req.body.visitorid as string;
		const email = req.body.email as string;

		let authUser = UsersList.findByAuthUid(uid);

		let newSessions: UserSession[] = [];

		if (authUser) {
			newSessions = authUser.sessions?.filter((session) => session.visitorid !== visitorid) || [];
		}

		if (!authUser) {
			authUser = await UsersList.create({ auth_uid: uid, firstname: '', lastname: '', email });
		}

		const newSession: UserSession = {
			mfaVerified: false,
			sws_last_seen: new Date().toISOString(),
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, req),
		};

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.mfaEnabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			if (isDev) {
				const tokenDev = generateTokenDev(authUser.user_email!, authUser.secret!);
				res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
			} else {
				res.status(200).json({ message: 'MFA_VERIFY' });
			}

			return;
		}

		const userInfo = {
			id: authUser.id,
			firstname: authUser.firstname,
			lastname: authUser.lastname,
			cong_name: authUser.cong_name,
			cong_number: authUser.cong_number,
			cong_role: authUser.cong_role,
			cong_id: authUser.cong_id,
			global_role: authUser.global_role,
			user_local_uid: authUser.user_local_uid,
			mfa: 'not_enabled',
			cong_encryption: '',
		};

		if (authUser.cong_id) {
			const cong = CongregationsList.findById(authUser.cong_id);
			userInfo.cong_encryption = cong!.cong_encryption;
		}

		res.locals.type = 'info';
		res.locals.message = 'user successfully logged in without MFA';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
