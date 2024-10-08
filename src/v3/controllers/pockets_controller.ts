import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../utils/format_log.js';
import { cookieOptions } from '../utils/app.js';
import { CongregationsList } from '../classes/Congregations.js';
import { decryptData } from '../services/encryption/encryption.js';
import { UserAuthResponse, UserSession } from '../definition/user.js';
import { retrieveVisitorDetails } from '../services/ip_details/auth_utils.js';
import { BackupData } from '../definition/congregation.js';
import { StandardRecord } from '../definition/app.js';

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

export const retrieveUserBackup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = res.locals.currentUser;
		const congId = user.profile.congregation?.id;
		const cong = CongregationsList.findById(congId!);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'user not associated to any congregation';

			res.clearCookie('visitorid');
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(user.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const result = {} as BackupData;

		const userUid = user.profile.congregation!.user_local_uid;

		if (cong.settings.data_sync.value) {
			result.app_settings = {
				cong_settings: structuredClone(cong.settings),
				user_settings: {
					cong_role: user.profile.congregation?.cong_role,
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					user_local_uid: user.profile.congregation?.user_local_uid,
					user_members_delegate: user.profile.congregation?.user_members_delegate,
					backup_automatic: user.settings.backup_automatic?.length > 0 ? user.settings.backup_automatic : undefined,
					theme_follow_os_enabled:
						user.settings.theme_follow_os_enabled?.length > 0 ? user.settings.theme_follow_os_enabled : undefined,
					hour_credits_enabled: user.settings.hour_credits_enabled?.length > 0 ? user.settings.hour_credits_enabled : undefined,
					data_view: user.settings.data_view?.length > 0 ? user.settings.data_view : undefined,
				},
			};

			result.app_settings.cong_settings.cong_master_key = undefined;

			const minimalPersons = cong.persons.map((record) => {
				const includeTimeAway = cong.settings.time_away_public.value;

				const personData = record.person_data as StandardRecord;

				return {
					_deleted: record._deleted,
					person_uid: record.person_uid,
					person_data: {
						person_firstname: personData.person_firstname,
						person_lastname: personData.person_lastname,
						person_display_name: personData.person_display_name,
						male: personData.male,
						female: personData.female,
						publisher_unbaptized: userUid === record.person_uid ? personData.publisher_unbaptized : undefined,
						publisher_baptized: userUid === record.person_uid ? personData.publisher_baptized : undefined,
						emergency_contacts: userUid === record.person_uid ? personData.emergency_contacts : undefined,
						assignments: userUid === record.person_uid ? personData.assignments : undefined,
						privileges: userUid === record.person_uid ? personData.privileges : undefined,
						enrollments: userUid === record.person_uid ? personData.enrollments : undefined,
						timeAway: includeTimeAway || userUid === record.person_uid ? personData.timeAway : undefined,
					},
				};
			});

			result.persons = minimalPersons;

			const isPublisher = user.profile.congregation!.cong_role.includes('publisher');

			if (isPublisher) {
				result.user_bible_studies = user.bible_studies;
				result.user_field_service_reports = user.field_service_reports;
			}
		}

		if (!cong.settings.data_sync.value) {
			const midweek = cong.settings.midweek_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			const weekend = cong.settings.weekend_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			result.app_settings = {
				cong_settings: {
					cong_access_code: cong.settings.cong_access_code,
					cong_circuit: cong.settings.cong_circuit,
					cong_discoverable: cong.settings.cong_discoverable,
					cong_location: cong.settings.cong_location,
					data_sync: cong.settings.data_sync,
					time_away_public: cong.settings.time_away_public,
					midweek_meeting: midweek,
					weekend_meeting: weekend,
					cong_name: cong.settings.cong_name,
					cong_number: cong.settings.cong_number,
					country_code: cong.settings.country_code,
					last_backup: cong.settings.last_backup,
				},
				user_settings: {
					cong_role: user.profile.congregation?.cong_role,
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					user_local_uid: user.profile.congregation?.user_local_uid,
					user_members_delegate: user.profile.congregation?.user_members_delegate,
				},
			};
		}

		result.public_sources = cong.public_schedules.sources.length === 0 ? [] : JSON.parse(cong.public_schedules.sources);

		result.public_schedules = cong.public_schedules.schedules.length === 0 ? [] : JSON.parse(cong.public_schedules.schedules);

		res.locals.type = 'info';
		res.locals.message = 'user retrieve backup successfully';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const saveUserBackup = async (req: Request, res: Response, next: NextFunction) => {
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

		const user = res.locals.currentUser;
		const congId = user.profile.congregation?.id;
		const cong = CongregationsList.findById(congId!);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'user not associated to any congregation';

			res.clearCookie('visitorid');
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(user.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const last_backup = req.headers.lastbackup as string;

		if (last_backup !== cong.settings.last_backup) {
			res.locals.type = 'info';
			res.locals.message = 'backup action rejected since it was changed recently';
			res.status(400).json({ message: 'BACKUP_OUTDATED' });
			return;
		}

		const cong_backup = req.body.cong_backup as BackupData;
		const userSettings = cong_backup.app_settings.user_settings;
		const userPerson = cong_backup.persons?.at(0);

		if (userSettings) {
			user.saveBackup(userSettings);
		}

		if (userPerson) {
			const personData = userPerson.person_data as StandardRecord;
			user.updatePersonData(personData.timeAway as string, personData.emergency_contacts as string);
		}

		res.locals.type = 'info';
		res.locals.message = 'user send backup successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
	} catch (err) {
		next(err);
	}
};

export const getPocketSessions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = res.locals.currentUser;
		const sessions = user.getActiveSessions(req.signedCookies.visitorid);

		res.locals.type = 'info';
		res.locals.message = `user has fetched sessions successfully`;
		res.status(200).json(sessions);
	} catch (err) {
		next(err);
	}
};

export const deletePocketSession = async (req: Request, res: Response, next: NextFunction) => {
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

		const identifier = req.body.identifier as string;

		const user = res.locals.currentUser;
		const sessions = await user.revokeSession(identifier);

		if (user.profile.congregation && user.profile.congregation.id.length > 0) {
			const cong = CongregationsList.findById(user.profile.congregation.id);

			if (cong) {
				cong.reloadMembers();
			}
		}

		res.locals.type = 'info';
		res.locals.message = `user has revoked session successfully`;
		res.status(200).json(sessions);
	} catch (err) {
		next(err);
	}
};
