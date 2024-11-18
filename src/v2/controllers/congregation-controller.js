import fetch from 'node-fetch';
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';
import { createCongregationAllowedRoles } from '../constant/constant.js';
import { ALL_LANGUAGES } from '../constant/constant.js';
import { sendWelcomeCPE } from '../utils/sendEmail.js';

const isDev = process.env.NODE_ENV === 'development';

export const getLastCongregationBackup = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (!id) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const cong = congregations.findCongregationById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isValid = cong.isMember(uid);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const user = users.findUserByAuthUid(uid);

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
	const secretaryRole = user.cong_role.includes('secretary');
	const weekendEditorRole = user.cong_role.includes('coordinator') || user.cong_role.includes('public_talk_coordinator');
	const publisherRole = isPublisher || isMS || isElder;

	if (!lmmoRole && !secretaryRole && !publisherRole && !weekendEditorRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to get congregation backup info';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const obj = { user_last_backup: user.last_backup ? { date: user.last_backup } : 'NO_BACKUP' };
	if (lmmoRole || secretaryRole || weekendEditorRole) {
		obj.cong_last_backup = cong.last_backup ? cong.last_backup : 'NO_BACKUP';
	}

	res.locals.type = 'info';
	res.locals.message = 'user get the latest backup info for the congregation';
	res.status(200).json(obj);
};

export const saveCongregationBackup = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (!id) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const cong = congregations.findCongregationById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isValid = cong.isMember(uid);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const user = users.findUserByAuthUid(uid);

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
	const secretaryRole = user.cong_role.includes('secretary');
	const weekendEditorRole = user.cong_role.includes('coordinator') || user.cong_role.includes('public_talk_coordinator');
	const publisherRole = isPublisher || isMS || isElder;

	if (!lmmoRole && !secretaryRole && !publisherRole && !weekendEditorRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to send congregation backup';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	if (secretaryRole) {
		const cong_serviceYear = req.body.cong_serviceYear;
		const isServiceYearValid = cong.isServiceYearValid(cong_serviceYear);

		if (!isServiceYearValid) {
			res.locals.type = 'warn';
			res.locals.message = 'backup aborted because of service years discrepancies';
			res.status(400).json({ message: 'BACKUP_DISCREPANCY' });

			return;
		}
	}

	const payload = req.body;

	if (lmmoRole || secretaryRole || weekendEditorRole) {
		await cong.saveBackup({
			cong_persons: payload.cong_persons,
			cong_deleted: payload.cong_deleted,
			cong_schedule: payload.cong_schedule,
			cong_sourceMaterial: payload.cong_sourceMaterial,
			cong_swsPocket: payload.cong_swsPocket,
			cong_settings: payload.cong_settings,
			cong_branchReports: payload.cong_branchReports,
			cong_fieldServiceGroup: payload.cong_fieldServiceGroup,
			cong_fieldServiceReports: payload.cong_fieldServiceReports,
			cong_lateReports: payload.cong_lateReports,
			cong_meetingAttendance: payload.cong_meetingAttendance,
			cong_minutesReports: payload.cong_minutesReports,
			cong_serviceYear: payload.cong_serviceYear,
			cong_publicTalks: payload.cong_publicTalks,
			cong_visitingSpeakers: payload.cong_visitingSpeakers,
			uid,
		});
	}

	if (publisherRole) {
		await user.saveBackup({
			user_bibleStudies: payload.user_bibleStudies,
			user_fieldServiceReports: payload.user_fieldServiceReports,
		});
	}

	res.locals.type = 'info';
	res.locals.message = 'user send backup for congregation successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getCongregationBackup = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (!id) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
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

	const user = users.findUserByAuthUid(uid);
	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
	const secretaryRole = user.cong_role.includes('secretary');
	const weekendEditorRole = user.cong_role.includes('coordinator') || user.cong_role.includes('public_talk_coordinator');
	const publisherRole = isPublisher || isMS || isElder;

	if (!lmmoRole && !secretaryRole && !publisherRole && !weekendEditorRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the congregation backup';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const obj = {};

	if (lmmoRole || secretaryRole || weekendEditorRole) {
		const backupData = cong.retrieveBackup();

		obj.cong_persons = backupData.cong_persons;
		obj.cong_settings = backupData.cong_settings;

		if (lmmoRole || weekendEditorRole) {
			obj.cong_schedule = backupData.cong_schedule;
			obj.cong_sourceMaterial = backupData.cong_sourceMaterial;
			obj.cong_publicTalks = backupData.cong_publicTalks;
		}

		if (secretaryRole) {
			obj.cong_branchReports = backupData.cong_branchReports;
			obj.cong_fieldServiceGroup = backupData.cong_fieldServiceGroup;
			obj.cong_fieldServiceReports = backupData.cong_fieldServiceReports;
			obj.cong_lateReports = backupData.cong_lateReports;
			obj.cong_meetingAttendance = backupData.cong_meetingAttendance;
			obj.cong_minutesReports = backupData.cong_minutesReports;
			obj.cong_serviceYear = backupData.cong_serviceYear;
		}

		if (weekendEditorRole) {
			obj.cong_visitingSpeakers = backupData.cong_visitingSpeakers;
		}
	}

	if (publisherRole) {
		const backupData = user.retrieveBackup();
		obj.user_bibleStudies = backupData.user_bibleStudies;
		obj.user_fieldServiceReports = backupData.user_fieldServiceReports;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup for congregation successfully';
	res.status(200).json(obj);
};

export const getMeetingSchedules = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (id) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
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

				const { cong_sourceMaterial, cong_schedule, cong_settings } = congregations.findCongregationById(id);

				res.locals.type = 'info';
				res.locals.message = 'user has fetched the schedule';
				res.status(200).json({
					cong_sourceMaterial,
					cong_schedule,
					cong_settings: {
						class_count: cong_settings[0]?.class_count || 1,
						source_lang: cong_settings[0]?.source_lang || 'e',
						co_name: cong_settings[0]?.co_name || '',
						co_displayName: cong_settings[0]?.co_displayName || '',
						opening_prayer_MM_autoAssign: cong_settings[0]?.opening_prayer_MM_autoAssign || false,
						opening_prayer_WM_autoAssign: cong_settings[0]?.opening_prayer_WM_autoAssign || false,
					},
				});
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation id params is undefined';
	res.status(400).json({ message: 'CONG_ID_INVALID' });
};

export const getCountries = async (req, res) => {
	let language = req.headers.language || 'e';

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

	language = language.toUpperCase();

	const isLangValid = ALL_LANGUAGES.find((lang) => lang.code.toUpperCase() === language);

	if (!isLangValid) {
		res.locals.type = 'warn';
		res.locals.message = `invalid language`;

		res.status(400).json({
			message: 'Bad request: provided inputs are invalid.',
		});

		return;
	}

	const url = process.env.APP_COUNTRY_API + new URLSearchParams({ language });

	const response = await fetch(url);

	if (response.ok) {
		const countriesList = await response.json();
		res.locals.type = 'info';
		res.locals.message = 'user fetched all countries';
		res.status(200).json(countriesList);
	} else {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while getting list of all countries';
		res.status(response.status).json({ message: 'FETCH_FAILED' });
	}
};

export const getCongregations = async (req, res) => {
	let { country, name } = req.headers;
	let language = req.headers.language || 'e';

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

	language = language.toUpperCase();
	country = country.toUpperCase();

	const isLangValid = ALL_LANGUAGES.find((lang) => lang.code.toUpperCase() === language);

	if (!isLangValid) {
		res.locals.type = 'warn';
		res.locals.message = `invalid language`;

		res.status(400).json({
			message: 'Bad request: provided inputs are invalid.',
		});

		return;
	}

	const url = process.env.APP_CONGREGATION_API + new URLSearchParams({ country, language, name });

	const response = await fetch(url);

	if (response.ok) {
		const congsList = await response.json();
		res.locals.type = 'info';
		res.locals.message = 'user fetched congregations';
		res.status(200).json(congsList);
	} else {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while getting congregations list';
		res.status(response.status).json({ message: 'FETCH_FAILED' });
	}
};

export const createCongregation = async (req, res) => {
	const { country_code, cong_name, cong_number, app_requestor, fullname } = req.body;
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

	if (!createCongregationAllowedRoles.includes(app_requestor)) {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${app_requestor}`;

		res.status(400).json({
			message: 'Bad request: provided inputs are invalid.',
		});

		return;
	}

	// find congregation
	const cong = congregations.findByNumber(`${country_code}${cong_number}`);
	if (cong) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation requested already exists';
		res.status(404).json({ message: 'CONG_EXISTS' });

		return;
	}

	// is congregation authentic
	const language = req.headers.applanguage || 'e';
	const url = process.env.APP_CONGREGATION_API + new URLSearchParams({ country: country_code, language, name: cong_number });

	const response = await fetch(url);
	if (response.status !== 200) {
		res.locals.type = 'warn';
		res.locals.message = 'an error occured while verifying the congregation data';
		res.status(response.status).json({ message: 'REQUEST_NOT_VALIDATED' });

		return;
	}

	const congsList = await response.json();
	const tmpCong = congsList[0];

	if (tmpCong.congName !== cong_name || tmpCong.congNumber !== cong_number) {
		res.locals.type = 'warn';
		res.locals.message = 'this request does not match any valid congregation';
		res.status(400).json({ message: 'BAD_REQUEST' });

		return;
	}

	// create congregation
	const newCong = await congregations.create({ country_code, cong_name, cong_number });

	// add user to congregation
	const tmpUser = users.findUserByAuthUid(uid);
	const user = await newCong.addUser(tmpUser.id, ['admin', app_requestor], fullname);

	if (!isDev) {
		sendWelcomeCPE(user.user_uid, fullname, `${cong_name} (${cong_number})`, language);
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation created successfully';
	res.status(200).json(user);
};

export const updateCongregationInfo = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;
	const { country_code, cong_name, cong_number } = req.body;

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

	if (id) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = cong.isMember(uid);

			if (isValid) {
				const data = { country_code, cong_name, cong_number };
				await cong.updateInfo(data);

				for await (const user of cong.cong_members) {
					const tmpUser = users.findUserById(user.id);
					await tmpUser.loadDetails();
				}

				cong.reloadMembers();
				const user = users.findUserByAuthUid(uid);

				res.locals.type = 'info';
				res.locals.message = 'congregation information updated';
				res.status(200).json(user);
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation id params is undefined';
	res.status(400).json({ message: 'CONG_ID_INVALID' });
};

export const postUserFieldServiceReports = async (req, res) => {
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
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
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

	const user = users.findUserByAuthUid(uid);

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const publisherRole = isPublisher || isMS || isElder;

	if (!publisherRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to post field service reports';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const report = req.body;
	await user.updatePendingFieldServiceReports(report);

	const data = { user_local_uid: user.user_local_uid, ...report };
	cong.updatePendingFieldServiceReports(data);

	res.locals.type = 'info';
	res.locals.message = 'user posted field service reports';
	res.status(200).json({ message: 'OK' });
};

export const unpostUserFieldServiceReports = async (req, res) => {
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
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
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

	const user = users.findUserByAuthUid(uid);

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const publisherRole = isPublisher || isMS || isElder;

	if (!publisherRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to post field service reports';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const month = req.body.month;
	await user.unpostFieldServiceReports(month);
	cong.removePendingFieldServiceReports(user.user_local_uid, month);

	res.locals.type = 'info';
	res.locals.message = 'user unposted field service reports';
	res.status(200).json({ message: 'OK' });
};
