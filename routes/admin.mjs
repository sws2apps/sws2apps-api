// dependencies
import express from 'express';
import crypto from 'crypto';
import Cryptr from 'cryptr';
import twofactor from 'node-2fa';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { body, validationResult } from 'express-validator';

// middlewares
import { adminAuthChecker } from '../middleware/admin-auth-checker.mjs';
import { sessionChecker } from '../middleware/session-checker.mjs';

// utils
import {
	sendCongregationAccountCreated,
	sendCongregationAccountDisapproved,
	sendUserResetPassword,
} from '../utils/sendEmail.mjs';

// get firestore
const db = getFirestore();

const router = express.Router();

router.use(adminAuthChecker());
router.use(sessionChecker());

router.post('/login', async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged in';

		// create identifier
		const cn_uid = crypto.randomUUID();

		// save new session
		let sessions = res.locals.userAbout.sessions || [];
		const now = new Date();
		const expiryDate = now.getTime() + 24 * 60 * 60000; // expired after 1 day
		sessions.push({
			cn_uid: cn_uid,
			expires: expiryDate,
			mfaVerified: false,
		});

		const data = {
			about: { ...res.locals.userAbout, sessions: sessions },
		};

		const { email } = req.body;
		await db.collection('users').doc(email).set(data, { merge: true });

		res.status(200).json({ message: cn_uid });
	} catch (err) {
		next(err);
	}
});

router.post('/logout', async (req, res, next) => {
	try {
		// create identifier
		const cn_uid = crypto.randomUUID();

		// save new session
		let sessions = res.locals.userAbout.sessions || [];
		sessions.length = 0;

		const data = {
			about: { ...res.locals.userAbout, sessions: sessions },
		};

		const { email } = req.body;
		await db.collection('users').doc(email).set(data, { merge: true });

		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged out';
		res.status(200).json({ message: cn_uid });
	} catch (err) {
		next(err);
	}
});

router.post('/pending-requests', async (req, res, next) => {
	try {
		const congRef = db.collection('congregation_request');
		const snapshot = await congRef.get();

		let requests = [];

		snapshot.forEach((doc) => {
			if (!doc.data().approval) {
				let obj = {};
				obj.id = doc.id;
				obj.data = doc.data();
				requests.push(obj);
			}
		});

		requests.sort((a, b) => {
			return a.id > b.id ? 1 : -1;
		});

		let finalResult = [];
		for (let i = 0; i < requests.length; i++) {
			const email = requests[i].data.email;
			const userRef = db.collection('users').doc(email);
			const userSnap = await userRef.get();

			const username = userSnap.data().about.name;

			let obj = {};
			obj.id = requests[i].id;
			obj.cong_name = requests[i].data.cong_name;
			obj.cong_number = requests[i].data.cong_number;
			obj.email = email;
			obj.username = username;

			finalResult.push(obj);
		}

		res.locals.type = 'info';
		res.locals.message = 'admin fetched pending requests';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
});

router.post(
	'/create-congregation',
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('request_email').isEmail(),
	body('request_id').notEmpty(),
	body('request_username').notEmpty(),
	async (req, res, next) => {
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

			// generate congregation id
			let setID = false;
			let num;

			do {
				const min = 1000000000;
				const max = 10000000000;

				num = crypto.randomInt(min, max);

				const congRef = db.collection('congregation_data').doc(num.toString());
				const docSnap = await congRef.get();

				if (!docSnap.exists) {
					setID = true;
				}
			} while (setID === false);

			// create congregation data
			const data = {
				cong_name: req.body.cong_name,
				cong_number: req.body.cong_number,
			};

			await db
				.collection('congregation_data')
				.doc(num.toString())
				.set(data, { merge: true });

			// update user permission
			const userData = {
				congregation: {
					id: num,
					role: 'admin',
				},
			};
			await db
				.collection('users')
				.doc(req.body.request_email)
				.set(userData, { merge: true });

			// update request props
			const requestData = {
				approval: 'approved',
			};
			await db
				.collection('congregation_request')
				.doc(req.body.request_id)
				.set(requestData, { merge: true });

			// send email to user
			sendCongregationAccountCreated(
				req.body.request_email,
				req.body.request_username,
				req.body.cong_name,
				req.body.cong_number
			);

			res.locals.type = 'info';
			res.locals.message = 'congregation created';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/congregation-request-disapprove',
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('request_email').isEmail(),
	body('request_id').notEmpty(),
	body('request_username').notEmpty(),
	body('disapproval_reason').notEmpty(),
	async (req, res, next) => {
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

			// update request props
			const requestData = {
				approval: 'disapproved',
			};
			await db
				.collection('congregation_request')
				.doc(req.body.request_id)
				.set(requestData, { merge: true });

			// send email to user
			sendCongregationAccountDisapproved(
				req.body.request_email,
				req.body.request_username,
				req.body.cong_name,
				req.body.cong_number,
				req.body.disapproval_reason
			);

			res.locals.type = 'info';
			res.locals.message = 'congregation account request disapproved';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.post('/get-users', async (req, res, next) => {
	try {
		const userRef = db.collection('users');
		const snapshot = await userRef.get();

		let tmpUsers = [];

		snapshot.forEach((doc) => {
			let obj = {};
			obj.email = doc.id;
			obj.username = doc.data().about.name;
			obj.global_role = doc.data().about.role;
			obj.mfaEnabled = doc.data().about.mfaEnabled;
			obj.cong_id = doc.data().congregation?.id || '';
			obj.cong_role = doc.data().congregation?.role || '';
			tmpUsers.push(obj);
		});

		tmpUsers.sort((a, b) => {
			return a.username > b.username ? 1 : -1;
		});

		let finalResult = [];
		for (let i = 0; i < tmpUsers.length; i++) {
			const userRecord = await getAuth().getUserByEmail(tmpUsers[i].email);

			let obj = {};
			obj.cong_name = '';
			obj.cong_number = '';

			if (tmpUsers[i].cong_id.toString().length > 0) {
				const congRef = db
					.collection('congregation_data')
					.doc(tmpUsers[i].cong_id.toString());
				const docSnap = await congRef.get();
				const cong_name = docSnap.data().cong_name || '';
				const cong_number = docSnap.data().cong_number || '';

				obj.cong_name = cong_name;
				obj.cong_number = cong_number;
			}

			obj.uid = userRecord.uid;
			obj.email = tmpUsers[i].email;
			obj.emailVerified = userRecord.emailVerified;
			obj.mfaEnabled = tmpUsers[i].mfaEnabled;
			obj.disabled = userRecord.disabled;
			obj.username = tmpUsers[i].username;
			obj.global_role = tmpUsers[i].global_role;
			obj.cong_role = tmpUsers[i].cong_role;

			finalResult.push(obj);
		}

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all users';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
});

router.post(
	'/delete-user',
	body('user_email').isEmail(),
	body('user_uid').notEmpty(),
	async (req, res, next) => {
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

			getAuth()
				.deleteUser(req.body.user_uid)
				.then(async () => {
					await db.collection('users').doc(req.body.user_email).delete();

					res.locals.type = 'info';
					res.locals.message = 'sucessfully deleted user';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error deleting user: ${error}`;
					res.status(400).json({ message: error });
				});
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/enable-user',
	body('user_uid').notEmpty(),
	async (req, res, next) => {
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

			getAuth()
				.updateUser(req.body.user_uid, {
					disabled: false,
				})
				.then(() => {
					res.locals.type = 'info';
					res.locals.message = 'user enabled successfully';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error updating user: ${error}`;
					res.status(400).json({ message: error });
				});
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/disable-user',
	body('user_uid').notEmpty(),
	async (req, res, next) => {
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

			getAuth()
				.updateUser(req.body.user_uid, {
					disabled: true,
				})
				.then(() => {
					res.locals.type = 'info';
					res.locals.message = 'user disabled successfully';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error updating user: ${error}`;
					res.status(400).json({ message: error });
				});
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/user-reset-password',
	body('user_username').notEmpty(),
	body('user_email').isEmail(),
	async (req, res, next) => {
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

			getAuth()
				.generatePasswordResetLink(req.body.user_email)
				.then((resetLink) => {
					// send email to user
					sendUserResetPassword(
						req.body.user_email,
						req.body.user_username,
						resetLink
					);

					res.locals.type = 'info';
					res.locals.message = 'user password reset email queued for sending';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error generating link: ${error}`;
					res.status(400).json({ message: error });
				});
		} catch (err) {
			next(err);
		}
	}
);

router.post('/get-congregations', async (req, res, next) => {
	try {
		const congRef = db.collection('congregation_data');
		let snapshot = await congRef.get();

		let tmpCongs = [];

		snapshot.forEach((doc) => {
			let obj = {};
			obj.cong_id = +doc.id;
			obj.cong_name = doc.data().cong_name;
			obj.cong_number = doc.data().cong_number;
			tmpCongs.push(obj);
		});

		tmpCongs.sort((a, b) => {
			return a.cong_name > b.cong_name ? 1 : -1;
		});

		const userRef = db.collection('users');
		snapshot = await userRef.get();

		let tmpUsers = [];

		snapshot.forEach((doc) => {
			let obj = {};
			obj.email = doc.id;
			obj.username = doc.data().about.name;
			obj.global_role = doc.data().about.role;
			obj.cong_id = doc.data().congregation?.id || '';
			obj.cong_role = doc.data().congregation?.role || '';
			tmpUsers.push(obj);
		});

		let finalResult = [];
		for (let i = 0; i < tmpCongs.length; i++) {
			let obj = {};
			obj.admin = [];
			obj.vip = [];
			obj.pocket = [];

			for (let a = 0; a < tmpUsers.length; a++) {
				if (tmpCongs[i].cong_id === tmpUsers[a].cong_id) {
					if (tmpUsers[a].cong_role === 'admin') {
						obj.admin.push({
							email: tmpUsers[a].email,
							name: tmpUsers[a].username,
						});
					} else if (tmpUsers[a].cong_role === 'vip') {
						obj.vip.push({
							email: tmpUsers[a].email,
							name: tmpUsers[a].username,
						});
					} else if (tmpUsers[a].cong_role === 'pocket') {
						obj.pocket.push({
							email: tmpUsers[a].email,
							name: tmpUsers[a].username,
						});
					}
				}
			}

			finalResult.push({ ...tmpCongs[i], ...obj });

			res.locals.type = 'info';
			res.locals.message = 'admin fetched all congregation';
			res.status(200).json(finalResult);
		}
	} catch (err) {
		next(err);
	}
});

router.post(
	'/congregation-add-admin',
	body('cong_id').isNumeric(),
	body('user_email').isEmail(),
	async (req, res, next) => {
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

			const data = {
				congregation: {
					id: +req.body.cong_id,
					role: 'admin',
				},
			};
			await db
				.collection('users')
				.doc(req.body.user_email)
				.set(data, { merge: true });

			res.locals.type = 'info';
			res.locals.message = 'admin added to congregation';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/congregation-remove-user',
	body('user_email').isEmail(),
	async (req, res, next) => {
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

			const userRef = db.collection('users').doc(req.body.user_email);
			const userSnap = await userRef.get();

			const data = {
				about: userSnap.data().about,
			};
			await db.collection('users').doc(req.body.user_email).set(data);

			res.locals.type = 'info';
			res.locals.message = 'admin/vip user removed to congregation';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/view-user-token',
	body('user_email').isEmail(),
	async (req, res, next) => {
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

			// Retrieve user from database
			const email = req.body.user_email;
			const userRef = db.collection('users').doc(email);
			const userSnap = await userRef.get();

			// get encrypted token
			const encryptedData = userSnap.data().about.secret;

			if (encryptedData) {
				// decrypt token
				const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
				const cryptr = new Cryptr(myKey);
				const decryptedData = cryptr.decrypt(encryptedData);

				// get base32 prop as secret
				const { base32: secret } = JSON.parse(decryptedData);

				res.locals.type = 'info';
				res.locals.message = 'admin fetch the user token';
				res.status(200).json({ message: secret });
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'the user has no mfa token yet';
				res.status(400).json({ message: 'NO_MFA_TOKEN' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/revoke-user-token',
	body('user_email').isEmail(),
	async (req, res, next) => {
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

			// get email
			const email = req.body.user_email;

			// generate new secret and encrypt
			const secret = twofactor.generateSecret({
				name: 'sws2apps',
				account: email,
			});

			const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
			const cryptr = new Cryptr(myKey);
			const encryptedData = cryptr.encrypt(JSON.stringify(secret));

			// Retrieve user from database

			const userRef = db.collection('users').doc(email);
			const userSnap = await userRef.get();

			// remove all sessions and save new secret
			const data = {
				about: {
					...userSnap.data().about,
					mfaEnabled: false,
					secret: encryptedData,
					sessions: [],
				},
			};
			await db.collection('users').doc(email).set(data, { merge: true });

			res.locals.type = 'info';
			res.locals.message = 'admin revoked user token access';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

export default router;
