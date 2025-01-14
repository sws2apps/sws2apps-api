// dependencies
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';
import { retrieveVisitorDetails } from '../utils/auth-utils.js';

export const validatePocket = async (req, res) => {
	const userInfo = structuredClone(res.locals.currentUser);

	const cong = congregations.findCongregationById(userInfo.cong_id);
	const isPublisher = cong.isPublisher(userInfo.user_local_uid);
	const isMS = cong.isMS(userInfo.user_local_uid);
	const isElder = cong.isElder(userInfo.user_local_uid);

	if (isPublisher) userInfo.cong_role.push('publisher');
	if (isMS) userInfo.cong_role.push('ms');
	if (isElder) userInfo.cong_role.push('elder');

	res.locals.type = 'info';
	res.locals.message = 'visitor id has been validated';
	res.status(200).json(userInfo);
};

export const pocketSignUp = async (req, res) => {
	const userIP = req.clientIp;
	const userAgent = req.headers['user-agent'];
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		let msg = '';
		errors.array().forEach((error) => {
			msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
		});

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'INPUT_INVALID' });

		return;
	}

	// get visitor ID and otp code
	const { otp_code } = req.body;
	const visitorid = isNaN(req.body.visitorid) ? req.body.visitorid : +req.body.visitorid;

	const user = await users.findUserByOTPCode(otp_code);

	if (!user) {
		res.locals.failedLoginAttempt = true;
		res.locals.type = 'warn';
		res.locals.message = 'the pocket could not be found';
		res.status(403).json({ message: 'POCKET_NOT_FOUND' });
		return;
	}

	// add visitor id and remove otp_code
	let devices = user.pocket_devices || [];
	const obj = {
		visitorid: visitorid,
		visitor_details: await retrieveVisitorDetails(userIP, userAgent),
		sws_last_seen: new Date().getTime(),
	};

	// add new device
	devices.push(obj);

	const final = await user.updatePocketDevices(devices);

	const userInfo = structuredClone(final);

	const cong = congregations.findCongregationById(userInfo.cong_id);
	const isPublisher = cong.isPublisher(userInfo.user_local_uid);
	const isMS = cong.isMS(userInfo.user_local_uid);
	const isElder = cong.isElder(userInfo.user_local_uid);

	if (isPublisher) userInfo.cong_role.push('publisher');
	if (isMS) userInfo.cong_role.push('ms');
	if (isElder) userInfo.cong_role.push('elder');

	res.locals.type = 'info';
	res.locals.message = 'pocket device visitor id added successfully';
	res.status(200).json(userInfo);
};

export const getSchedule = async (req, res) => {
	const { cong_id } = res.locals.currentUser;

	const { cong_sourceMaterial, cong_schedule, cong_settings } = congregations.findCongregationById(cong_id);

	res.locals.type = 'info';
	res.locals.message = 'pocket user has fetched the schedule';
	res.status(200).json({
		cong_sourceMaterial,
		cong_schedule,
		cong_settings: {
			class_count: cong_settings[0]?.class_count || 1,
			source_lang: cong_settings[0]?.source_lang || 'e',
			co_name: cong_settings[0]?.co_name || '',
			co_displayName: cong_settings[0]?.co_displayName || '',
			opening_prayer_autoAssign: cong_settings[0]?.opening_prayer_autoAssign || false,
		},
	});
};

export const getUserDevices = async (req, res) => {
	const { id } = req.params;

	if (id) {
		const user = users.findUserById(id);
		if (user) {
			res.locals.type = 'info';
			res.locals.message = `the user has fetched sessions successfully`;
			res.status(200).json(user.pocket_devices);
		} else {
			res.locals.type = 'warn';
			res.locals.message = `user could not be found`;
			res.status(400).json({ message: 'USER_NOT_FOUND' });
		}
	} else {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}
};

export const pocketDeleteDevice = async (req, res) => {
	const { id } = req.params;

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

	const { pocket_visitorid } = req.body;

	if (id) {
		const userData = await users.findUserById(id);

		if (userData) {
			// remove device
			let devices = userData.pocket_devices || [];
			let newDevices = devices.filter((device) => device.visitorid !== pocket_visitorid);

			if (newDevices.length > 0) {
				await userData.removePocketDevice(newDevices);

				res.locals.type = 'info';
				res.locals.message = 'pocket device successfully removed';
				res.status(200).json({ devices: newDevices });
			}

			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the pocket user could not be found';
		res.status(400).json({ message: 'POCKET_NOT_FOUND' });
	}

	res.locals.type = 'warn';
	res.locals.message = 'the pocket user id params is undefined';
	res.status(400).json({ message: 'POCKET_ID_INVALID' });
};

export const getLastUserBackup = async (req, res) => {
	const { id } = req.params;

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
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
		return;
	}

	const user = users.findUserById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `user could not be found`;
		res.status(400).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const { cong_id } = res.locals.currentUser;

	const cong = congregations.findCongregationById(cong_id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const publisherRole = isPublisher || isMS || isElder;

	if (!publisherRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to get backup';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user get the latest user backup info';
	res.status(200).json({
		user_last_backup: user.last_backup ? { date: user.last_backup } : 'NO_BACKUP',
	});
};

export const saveUserBackup = async (req, res) => {
	const { id } = req.params;

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
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
		return;
	}

	const user = users.findUserById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `user could not be found`;
		res.status(400).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const { cong_id } = res.locals.currentUser;

	const cong = congregations.findCongregationById(cong_id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const publisherRole = isPublisher || isMS || isElder;

	if (!publisherRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to save backup';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const payload = req.body;

	await user.saveBackup({
		user_bibleStudies: payload.user_bibleStudies,
		user_fieldServiceReports: payload.user_fieldServiceReports,
	});

	res.locals.type = 'info';
	res.locals.message = 'user send backup successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getUserBackup = async (req, res) => {
	const { id } = req.params;

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
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
		return;
	}

	const user = users.findUserById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `user could not be found`;
		res.status(400).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const { cong_id } = res.locals.currentUser;

	const cong = congregations.findCongregationById(cong_id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isPublisher = cong.isPublisher(user.user_local_uid);
	const isMS = cong.isMS(user.user_local_uid);
	const isElder = cong.isElder(user.user_local_uid);

	const publisherRole = isPublisher || isMS || isElder;

	if (!publisherRole) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the congregation backup';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	const obj = {};

	if (publisherRole) {
		const backupData = user.retrieveBackup();
		obj.user_bibleStudies = backupData.user_bibleStudies;
		obj.user_fieldServiceReports = backupData.user_fieldServiceReports;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup successfully';
	res.status(200).json(obj);
};

export const postPocketFieldServiceReports = async (req, res) => {
	const { id } = req.params;

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
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
		return;
	}

	const user = users.findUserById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `user could not be found`;
		res.status(400).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const { cong_id } = res.locals.currentUser;

	const cong = congregations.findCongregationById(cong_id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

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

export const unpostPocketFieldServiceReports = async (req, res) => {
	const { id } = req.params;

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
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
		return;
	}

	const user = users.findUserById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `user could not be found`;
		res.status(400).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const { cong_id } = res.locals.currentUser;

	const cong = congregations.findCongregationById(cong_id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

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
	const result = await user.unpostFieldServiceReports(month);

	if (!result) {
		res.locals.type = 'info';
		res.locals.message = 'requested report to unpost no longer available';
		res.status(404).json({ message: 'REPORT_NOT_FOUND' });
		return;
	}

	cong.removePendingFieldServiceReports(user.user_local_uid, month);
	res.locals.type = 'info';
	res.locals.message = 'requested report uposted';
	res.status(200).json({ message: 'OK' });
};
