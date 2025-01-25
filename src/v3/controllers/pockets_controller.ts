import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../utils/format_log.js';
import { cookieOptions } from '../utils/app.js';
import { CongregationsList } from '../classes/Congregations.js';
import { decryptData } from '../services/encryption/encryption.js';
import { UserAuthResponse, UserSession } from '../definition/user.js';
import { retrieveVisitorDetails } from '../services/ip_details/auth_utils.js';
import { BackupData, CongSettingsType } from '../definition/congregation.js';
import { StandardRecord } from '../definition/app.js';
import { UsersList } from '../classes/Users.js';

export const validateInvitation = async (req: Request, res: Response) => {
	// validate through express middleware
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

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
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
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
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
		return;
	}

	matches = Array.from(groups);

	const country = matches.at(1)!;
	const number = matches.at(2)!;

	const cong = CongregationsList.findByCountryAndNumber(country, number);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided code';
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
		return;
	}

	// check access code
	const encryptedAccessCode = cong.settings.cong_access_code;
	const decryptedAccessCode = decryptData(encryptedAccessCode, tmpAccessCode);

	if (!decryptedAccessCode) {
		res.locals.type = 'warn';
		res.locals.message = 'the code received is invalid';
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
		return;
	}

	const accessCode = JSON.parse(decryptedAccessCode);

	const user = cong.findPocketUser(code, accessCode);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the code received is invalid';
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
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
};

export const validatePocket = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;

	const congId = user.profile.congregation?.id;
	const cong = CongregationsList.findById(congId!);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided code';

		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
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
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;
	const congId = user.profile.congregation?.id;
	const cong = CongregationsList.findById(congId!);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user not associated to any congregation';

		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return;
	}

	const isValid = cong.hasMember(user.id);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const metadata = JSON.parse(req.headers.metadata!.toString()) as Record<string, string>;

	const result = {} as BackupData;

	const userUid = user.profile.congregation!.user_local_uid;
	const delegates = user.profile.congregation!.user_members_delegate;

	const miniPersons = delegates ? structuredClone(delegates) : [];

	if (userUid && userUid?.length > 0) {
		miniPersons.push(userUid);
	}

	if (cong.settings.data_sync.value) {
		result.app_settings = {};
		result.metadata = {};

		let localDate = user.metadata.user_settings;
		let incomingDate = metadata.user_settings;

		if (localDate !== incomingDate) {
			result.app_settings.user_settings = {
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
			};

			result.metadata.user_settings = localDate;
		}

		result.app_settings.cong_settings = {
			cong_access_code: cong.settings.cong_access_code,
			data_sync: cong.settings.data_sync,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
		} as CongSettingsType;

		localDate = cong.metadata.cong_settings;
		incomingDate = metadata.cong_settings;

		if (localDate !== incomingDate) {
			result.app_settings.cong_settings = structuredClone(cong.settings);
			result.app_settings.cong_settings.cong_master_key = undefined;

			result.metadata.cong_settings = localDate;
		}

		localDate = cong.metadata.persons;
		incomingDate = metadata.persons;

		if (localDate !== incomingDate) {
			const minimalPersons = cong.persons.map((record) => {
				const includeTimeAway = cong.settings.time_away_public?.value;

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
						publisher_unbaptized: miniPersons.includes(String(record.person_uid)) ? personData.publisher_unbaptized : undefined,
						publisher_baptized: miniPersons.includes(String(record.person_uid)) ? personData.publisher_baptized : undefined,
						emergency_contacts: miniPersons.includes(String(record.person_uid)) ? personData.emergency_contacts : undefined,
						assignments: miniPersons.includes(String(record.person_uid)) ? personData.assignments : undefined,
						privileges: miniPersons.includes(String(record.person_uid)) ? personData.privileges : undefined,
						enrollments: miniPersons.includes(String(record.person_uid)) ? personData.enrollments : undefined,
						timeAway: includeTimeAway || miniPersons.includes(String(record.person_uid)) ? personData.timeAway : undefined,
					},
				};
			});

			result.persons = minimalPersons;

			result.metadata.persons = localDate;
		}

		const isPublisher = user.profile.congregation!.cong_role.includes('publisher');

		if (isPublisher) {
			localDate = user.metadata.user_bible_studies;
			incomingDate = metadata.user_bible_studies;

			if (localDate !== incomingDate) {
				result.user_bible_studies = user.bible_studies;
				result.metadata.user_bible_studies = localDate;
			}

			localDate = user.metadata.user_field_service_reports;
			incomingDate = metadata.user_field_service_reports;

			if (localDate !== incomingDate) {
				result.user_field_service_reports = user.field_service_reports;
				result.metadata.user_field_service_reports = localDate;
			}

			localDate = user.metadata.delegated_field_service_reports;
			incomingDate = metadata.delegated_field_service_reports;

			if (localDate !== incomingDate) {
				result.delegated_field_service_reports = user.delegated_field_service_reports;
				result.metadata.delegated_field_service_reports = localDate;
			}

			localDate = cong.metadata.field_service_groups;
			incomingDate = metadata.field_service_groups;

			if (localDate !== incomingDate) {
				result.field_service_groups = cong.field_service_groups;
				result.metadata.field_service_groups = localDate;
			}

			localDate = cong.metadata.cong_field_service_reports;
			incomingDate = metadata.cong_field_service_reports;

			if (localDate !== incomingDate) {
				if (user.profile.congregation?.user_local_uid) {
					const congUserReports = cong.field_service_reports.filter((record) => {
						const data = record.report_data as StandardRecord;

						return miniPersons.includes(String(data.person_uid));
					});

					result.cong_field_service_reports = congUserReports;
					result.metadata.cong_field_service_reports = localDate;
				}
			}
		}
	}

	if (!cong.settings.data_sync.value) {
		result.app_settings = {};
		result.metadata = {};

		const localUserDate = user.metadata.user_settings;
		const incomingUserDate = metadata.user_settings;

		if (localUserDate !== incomingUserDate) {
			result.app_settings.user_settings = {
				cong_role: user.profile.congregation?.cong_role,
				firstname: user.profile.firstname,
				lastname: user.profile.lastname,
				user_local_uid: user.profile.congregation?.user_local_uid,
				user_members_delegate: user.profile.congregation?.user_members_delegate,
			};

			result.metadata.user_settings = localUserDate;
		}

		result.app_settings.cong_settings = {
			cong_access_code: cong.settings.cong_access_code,
			data_sync: cong.settings.data_sync,
			cong_name: cong.settings.cong_name,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
		} as CongSettingsType;

		const localCongDate = cong.metadata.cong_settings;
		const incomingCongDate = metadata.cong_settings;

		if (incomingCongDate !== localCongDate) {
			const midweek = cong.settings.midweek_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			const weekend = cong.settings.weekend_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			result.app_settings.cong_settings.cong_circuit = cong.settings.cong_circuit;
			result.app_settings.cong_settings.cong_discoverable = cong.settings.cong_discoverable;
			result.app_settings.cong_settings.cong_location = cong.settings.cong_location;
			result.app_settings.cong_settings.time_away_public = cong.settings.time_away_public;
			result.app_settings.cong_settings.midweek_meeting = midweek;
			result.app_settings.cong_settings.weekend_meeting = weekend;

			result.metadata.cong_settings = localCongDate;
		}
	}

	let localDate = cong.metadata.public_sources;
	let incomingDate = metadata.public_sources;

	if (localDate !== incomingDate) {
		result.public_sources = cong.public_schedules.sources.length === 0 ? [] : JSON.parse(cong.public_schedules.sources);

		result.metadata.public_sources = localDate;
	}

	localDate = cong.metadata.public_schedules;
	incomingDate = metadata.public_schedules;

	if (localDate !== incomingDate) {
		result.public_schedules = cong.public_schedules.schedules.length === 0 ? [] : JSON.parse(cong.public_schedules.schedules);

		result.metadata.public_schedules = localDate;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup successfully';
	res.status(200).json(result);
};

export const saveUserBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
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
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return;
	}

	const isValid = cong.hasMember(user.id);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const incomingMetadata = JSON.parse(req.headers.metadata!.toString()) as Record<string, string>;
	const currentMetadata = { ...cong.metadata, ...user.metadata };

	let isOutdated = false;

	for (const [key, value] of Object.entries(incomingMetadata)) {
		if (currentMetadata[key] && currentMetadata[key] > value) {
			isOutdated = true;
			break;
		}
	}

	if (isOutdated) {
		res.locals.type = 'info';
		res.locals.message = `user backup outdated`;
		res.status(400).json({ message: 'BACKUP_OUTDATED' });

		return;
	}

	const userRole = user.profile.congregation!.cong_role;

	const cong_backup = req.body.cong_backup as BackupData;
	const userPerson = cong_backup.persons?.at(0);

	if (userPerson) {
		const personData = userPerson.person_data as StandardRecord;
		user.updatePersonData(personData.timeAway as string, personData.emergency_contacts as string);
	}

	user.saveBackup(cong_backup, userRole);

	res.locals.type = 'info';
	res.locals.message = 'user send backup successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getPocketSessions = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;
	const sessions = user.getActiveSessions(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = `user has fetched sessions successfully`;
	res.status(200).json(sessions);
};

export const deletePocketSession = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
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
};

export const postPocketReport = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
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
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return;
	}

	const isValid = cong.hasMember(user.id);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	const report = req.body.report as StandardRecord;
	user.postReport(report);

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const getPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;

	const results = user.getApplications();

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;
	const congId = user.profile.congregation!.id;
	const cong = CongregationsList.findById(congId)!;

	const form = req.body.application as StandardRecord;

	const application = {
		request_id: crypto.randomUUID().toUpperCase(),
		person_uid: user.profile.congregation!.user_local_uid,
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
};

export const deletePocketUser = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;
	const congId = user.profile.congregation?.id;

	await UsersList.delete(user.id);

	if (congId) {
		const cong = CongregationsList.findById(congId);
		cong?.reloadMembers();
	}

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};
