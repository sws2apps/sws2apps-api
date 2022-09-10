// import dependecies
import { validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// utils import
import { sendVerificationEmail } from '../utils/sendEmail.js';
import { getAnnouncementsClient } from '../utils/announcement-utils.js';
import {
	findUserById,
	getUserActiveSessions,
	getUserInfo,
	revokeSessions,
} from '../utils/user-utils.js';
import { decryptData } from '../utils/encryption-utils.js';

// get firestore
const db = getFirestore(); //get default database

export const createAccount = async (req, res, next) => {
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

		const { fullname, email, password } = req.body;

		getAuth()
			.createUser({
				email: email,
				emailVerified: false,
				password: password,
				disabled: false,
			})
			.then((userRecord) => {
				const userEmail = userRecord.email;
				getAuth()
					.generateEmailVerificationLink(userEmail)
					.then(async (link) => {
						sendVerificationEmail(userEmail, fullname, link);

						const data = {
							about: {
								name: fullname,
								role: 'vip',
								user_uid: userEmail,
							},
						};

						await db.collection('users').add(data);

						res.locals.type = 'info';
						res.locals.message = `user account created and the verification email queued for sending`;
						res.status(200).json({ message: 'CHECK_EMAIL' });
					})
					.catch(() => {
						res.locals.type = 'warn';
						res.locals.message = `user account created, but the verification email could not be sent`;
						res.status(200).json({ message: 'VERIFY_FAILED' });
					});
			})
			.catch((err) => {
				next(err);
			});
	} catch (err) {
		next(err);
	}
};

export const getAnnouncements = async (req, res, next) => {
	try {
		const announcements = await getAnnouncementsClient();

		res.locals.type = 'info';
		res.locals.message = `client fetched announcements`;

		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
};

export const validateUser = async (req, res, next) => {
	try {
		const { email } = req.headers;
		const { id, cong_id, cong_name, cong_number, cong_role } =
			await getUserInfo(email);

		if (cong_name.length > 0) {
			let obj = { id, cong_id, cong_name, cong_number, cong_role };

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

export const resendVerificationEmail = async (req, res, next) => {
	try {
		const { email } = req.headers;

		getAuth()
			.generateEmailVerificationLink(email)
			.then((link) => {
				sendVerificationEmail(email, link);

				res.locals.type = 'info';
				res.locals.message = `new verification email queued for sending`;

				res.status(200).json({ message: 'CHECK_EMAIL' });
			})
			.catch(() => {
				res.locals.type = 'warn';
				res.locals.message = `new verification email could not be sent`;

				res.status(200).json({ message: 'VERIFY_FAILED' });
			});
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
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			const { fullname } = req.body;
			await db.collection('users').doc(id).update({ 'about.name': fullname });

			res.locals.type = 'info';
			res.locals.message = `the user fullname has been updated successfully`;
			res.status(200).json({ fullname });
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
			const user = await findUserById(id);

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

			const { password } = req.body;
			const { auth_uid } = user;

			await getAuth().updateUser(auth_uid, { password: password });

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
			// Retrieve user from database
			const userRef = db.collection('users').doc(id);
			const userSnap = await userRef.get();

			// get encrypted token
			const encryptedData = userSnap.data().about.secret;

			// decrypt token
			const decryptedData = decryptData(encryptedData);

			// get uri and qr
			const { secret, uri } = JSON.parse(decryptedData);

			res.locals.type = 'info';
			res.locals.message = `the user has fetched 2fa successfully`;
			res.status(200).json({
				secret: secret,
				qrCode: uri,
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
			const sessions = await getUserActiveSessions(id);

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
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			const { session } = req.body;

			await revokeSessions(id, session);

			const sessions = await getUserActiveSessions(id);

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
		const { email, visitor_id } = req.headers;
		const user = await getUserInfo(email);

		await revokeSessions(user.id, visitor_id);

		res.locals.type = 'info';
		res.locals.message = `the current user has logged out`;
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};
