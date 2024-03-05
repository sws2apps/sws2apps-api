import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { fetchCrowdinAnnouncements } from '../utils/announcement-utils.js';
import { congregations } from '../classes/Congregations.js';
import { generateTokenDev } from '../dev/setup.js';

const isDev = process.env.NODE_ENV === 'development';

export const createAccount = async (req, res, next) => {
	try {
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

		const { fullname, email, password } = req.body;

		const user = await users.create(fullname, email, password);

		res.locals.type = 'info';
		res.locals.message = `user account created and the verification email queued for sending`;
		res.status(200).json({ message: 'CHECK_EMAIL', email: user.user_uid, fullname: user.username });
	} catch (err) {
		next(err);
	}
};

export const validateUser = async (req, res, next) => {
	try {
		const { uid } = req.headers;
		const user = await users.findUserByAuthUid(uid);

		if (user.cong_name.length > 0) {
			const userInfo = structuredClone(user);

			const cong = congregations.findCongregationById(userInfo.cong_id);
			const isPublisher = cong.isPublisher(userInfo.user_local_uid);
			const isMS = cong.isMS(userInfo.user_local_uid);
			const isElder = cong.isElder(userInfo.user_local_uid);

			const obj = {
				id: userInfo.id,
				cong_id: userInfo.cong_id,
				cong_name: userInfo.cong_name,
				cong_number: userInfo.cong_number,
				cong_role: userInfo.cong_role,
				user_local_uid: userInfo.user_local_uid,
				user_members_delegate: userInfo.user_members_delegate,
				firstname: userInfo.firstname,
				lastname: userInfo.lastname,
				cong_encryption: cong.cong_encryption,
				mfaEnabled: userInfo.mfaEnabled,
			};

			if (isElder) obj.cong_role.push('elder');
			if (isMS) obj.cong_role.push('ms');
			if (isPublisher) obj.cong_role.push('publisher');

			// retrieve congregation persons records if elder
			if (isElder) {
				const lmmoRole = obj.cong_role.includes('lmmo') || obj.cong_role.includes('lmmo-backup');
				const secretaryRole = obj.cong_role.includes('secretary');
				const coordinatorRole = obj.cong_role.includes('coordinator');
				const publicTalkCoordinatorRole = obj.cong_role.includes('public_talk_coordinator');

				// exclude lmmo, secretary, coordinator, public_talk_coordinator
				if (!lmmoRole && !secretaryRole && !coordinatorRole && !publicTalkCoordinatorRole) {
					const backupData = cong.retrieveBackup();
					obj.cong_persons = backupData.cong_persons;
				}
			}

			// retrieve latest field service reports if publisher
			const publisherRole = isElder || isMS || isPublisher;
			if (publisherRole) {
				const backupData = user.retrieveBackup();
				obj.user_fieldServiceReports = backupData.user_fieldServiceReports;
			}

			res.locals.type = 'info';
			res.locals.message = 'visitor id has been validated';
			res.status(200).json(obj);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'email address not associated with a congregation';

			res.status(404).json({ message: 'CONG_NOT_FOUND' });
		}
	} catch (err) {
		next(err);
	}
};

export const updateUserFullname = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
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

			const { fullname } = req.body;

			const user = users.findUserById(id);
			await user.updateFullname(fullname);

			res.locals.type = 'info';
			res.locals.message = `the user fullname has been updated successfully`;
			res.status(200).json({ fullname: user.username });
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};

export const updateUserPassword = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
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

			const { password } = req.body;

			const user = users.findUserById(id);
			await user.updatePassword(password);

			res.locals.type = 'info';
			res.locals.message = `the user password has been updated successfully`;
			res.status(200).json({ message: 'OK' });
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};

export const getUserSecretToken = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const user = users.findUserById(id);
			await user.generateSecret();
			const { secret, uri } = user.decryptSecret();

			if (!user.mfaEnabled && isDev) {
				const tokenDev = generateTokenDev(user.user_uid, user.secret);
				console.log(`Please use this OTP code if you want to enable MFA: ${tokenDev}`);
			}

			res.locals.type = 'info';
			res.locals.message = `the user has fetched 2fa successfully`;
			res.status(200).json({
				secret: secret,
				qrCode: uri,
				mfaEnabled: user.mfaEnabled,
			});
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};

export const getUserSessions = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const user = users.findUserById(id);
			const sessions = user.getActiveSessions();

			res.locals.type = 'info';
			res.locals.message = `the user has fetched sessions successfully`;
			res.status(200).json(sessions);
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};

export const deleteUserSession = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
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

			const { session } = req.body;

			const user = users.findUserById(id);
			const sessions = user.revokeSession(session);

			res.locals.type = 'info';
			res.locals.message = `the user has revoked session successfully`;
			res.status(200).json(sessions);
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user and session id are required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};

export const userLogout = async (req, res, next) => {
	try {
		const { uid } = req.headers;
		const visitorid = isNaN(req.headers.visitorid) ? req.headers.visitorid : +req.headers.visitorid;

		const user = users.findUserByAuthUid(uid);
		await user.revokeSession(visitorid);

		res.locals.type = 'info';
		res.locals.message = `the current user has logged out`;
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const getAnnouncementsV2 = async (req, res, next) => {
	try {
		const { cong_role } = req.headers;

		const list = await fetchCrowdinAnnouncements(cong_role);

		res.locals.type = 'info';
		res.locals.message = `client fetched announcements`;

		res.status(200).json(list);
	} catch (err) {
		next(err);
	}
};

export const disableUser2FA = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const user = users.findUserById(id);
			await user.disable2FA();

			res.locals.type = 'info';
			res.locals.message = `the user disabled 2fa successfully`;
			res.status(200).json({ message: 'MFA_DISABLED' });
		} else {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: user id is required`;
			res.status(400).json({ message: 'USER_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};
