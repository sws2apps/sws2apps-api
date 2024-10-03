import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../utils/format_log.js';
import { cookieOptions } from '../utils/app.js';
import { CongregationsList } from '../classes/Congregations.js';
import { decryptData } from '../services/encryption/encryption.js';
import { UserAuthResponse, UserSession } from '../definition/user.js';
import { retrieveVisitorDetails } from '../services/ip_details/auth_utils.js';

export const validateInvitation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// validate through express middleware
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

		const userIP = req.clientIp!;

		// get or assign visitor id
		const visitorid: string = req.signedCookies.visitorid || crypto.randomUUID();

		// find congregation
		const code = req.body.code as string;

		const pattern = '(.+?)-(.+?)-(.+?)$';
		let rgExp = new RegExp(pattern, 'g');
		let groups = rgExp.exec(code);

		if (groups === null) {
			res.locals.type = 'warn';
			res.locals.message = 'the code received is invalid';
			res.status(400).json({ message: 'INVALID_CODE' });
			return;
		}

		let matches = Array.from(groups);

		const congInfo = matches.at(1)!;
		const tmpAccessCode = matches.at(3)!;

		const congPattern = '(.+?)(\\d+)$';
		rgExp = new RegExp(congPattern, 'g');
		groups = rgExp.exec(congInfo);

		if (groups === null) {
			res.locals.type = 'warn';
			res.locals.message = 'the code received is invalid';
			res.status(400).json({ message: 'INVALID_CODE' });
			return;
		}

		matches = Array.from(groups);

		const country = matches.at(1)!;
		const number = matches.at(2)!;

		const cong = CongregationsList.findByCountryAndNumber(country, number);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided code';
			res.status(400).json({ message: 'INVALID_CODE' });
			return;
		}

		// check access code
		const encryptedAccessCode = cong.settings.cong_access_code;
		const decryptedAccessCode = decryptData(encryptedAccessCode, tmpAccessCode);

		if (!decryptedAccessCode) {
			res.locals.type = 'warn';
			res.locals.message = 'the code received is invalid';
			res.status(400).json({ message: 'INVALID_CODE' });
			return;
		}

		const accessCode = JSON.parse(decryptedAccessCode);

		const user = cong.findPocketUser(code, accessCode);

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'the code received is invalid';
			res.status(400).json({ message: 'INVALID_CODE' });
			return;
		}

		const profile = structuredClone(user.profile);
		profile.congregation!.pocket_invitation_code = undefined;

		await user.updateProfile(profile);

		const newSessions = user.sessions?.filter((session) => session.visitorid !== visitorid) || [];

		const newSession: UserSession = {
			mfaVerified: false,
			last_seen: new Date().toISOString(),
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, req),
			identifier: crypto.randomUUID(),
		};

		newSessions.push(newSession);

		await user.updateSessions(newSessions);

		cong.reloadMembers();

		const userInfo: UserAuthResponse = {
			message: 'TOKEN_VALID',
			id: user.id,
			app_settings: {
				user_settings: {
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					role: user.profile.role,
					user_local_uid: user.profile.congregation!.user_local_uid,
					cong_role: user.profile.congregation!.cong_role,
					user_members_delegate: user.profile.congregation!.user_members_delegate,
				},
			},
		};

		const midweek = cong.settings.midweek_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday };
		});

		const weekend = cong.settings.weekend_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday };
		});

		userInfo.app_settings.cong_settings = {
			id: user.profile.congregation!.id,
			cong_circuit: cong.settings.cong_circuit,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
			cong_access_code: cong.settings.cong_access_code,
			cong_location: cong.settings.cong_location,
			midweek_meeting: midweek,
			weekend_meeting: weekend,
		};

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';

		res.cookie('visitorid', visitorid, cookieOptions(req));
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};

export const validatePocket = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = res.locals.currentUser;

		const congId = user.profile.congregation?.id;
		const cong = CongregationsList.findById(congId!);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided code';

			res.clearCookie('visitorid');
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const userInfo: UserAuthResponse = {
			id: user.id,
			app_settings: {
				user_settings: {
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					role: user.profile.role,
					user_local_uid: user.profile.congregation!.user_local_uid,
					cong_role: user.profile.congregation!.cong_role,
					user_members_delegate: user.profile.congregation!.user_members_delegate,
				},
			},
		};

		const midweek = cong.settings.midweek_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday };
		});

		const weekend = cong.settings.weekend_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday };
		});

		userInfo.app_settings.cong_settings = {
			id: user.profile.congregation!.id,
			cong_circuit: cong.settings.cong_circuit,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
			cong_access_code: cong.settings.cong_access_code,
			cong_location: cong.settings.cong_location,
			midweek_meeting: midweek,
			weekend_meeting: weekend,
		};

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
