// dependencies
import express from 'express';
import fetch from 'node-fetch';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// middlewares
import { authChecker } from '../middleware/auth-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';

// utils import
import { sendVerificationEmail } from '../utils/sendEmail.js';

// get firestore
const db = getFirestore(); //get default database

const router = express.Router();

// without auth middleware
router.post(
	'/create-account',
	body('fullname').isLength({ min: 3 }),
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
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
				.createUser({
					email: req.body.email,
					emailVerified: false,
					password: req.body.password,
					disabled: false,
				})
				.then((userRecord) => {
					const userEmail = userRecord.email;
					getAuth()
						.generateEmailVerificationLink(userEmail)
						.then(async (link) => {
							sendVerificationEmail(userEmail, link);

							const data = {
								about: {
									name: req.body.fullname,
									role: 'vip',
								},
							};

							await db.collection('users').doc(userEmail).set(data);

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
	}
);

router.use(visitorChecker());

router.get('/validate-me', async (req, res, next) => {
	try {
		const { email } = req.headers;
		const congInfo = await getCongregationInfo(email);

		if (congInfo) {
			obj.congregation = {};
			obj.congregation = { ...congInfo };

			res.locals.type = 'info';
			res.locals.message = 'visitor id has been validated';

			res.status(200).json(obj);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'email address not associated with a congregation';

			res.status(403).json({ message: 'CONG_NOT_FOUND' });
		}
	} catch (err) {
		next(err);
	}
});

router.get('/resend-verification', async (req, res, next) => {
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
});

router.use(authChecker());
// with inline middleware
router.get('/get-backup', async (req, res, next) => {
	try {
		const uid = req.headers.uid;
		getAuth()
			.getUser(uid)
			.then(async () => {
				const userRef = db.collection('user_backup').doc(uid);
				const docSnap = await userRef.get();

				if (docSnap.exists) {
					if (docSnap.data().lmmoa) {
						res.locals.type = 'info';
						res.locals.message = `get user backup success`;
						res.status(200).json({ message: docSnap.data().lmmoa });
					} else {
						res.locals.type = 'info';
						res.locals.message = `the user has no backup`;
						res.status(404).json({ message: 'NOT_FOUND' });
					}
				} else {
					res.locals.type = 'info';
					res.locals.message = `the user has no backup`;
					res.status(404).json({ message: 'NOT_FOUND' });
				}
			})
			.catch((err) => {
				next(err);
			});
	} catch (err) {
		next(err);
	}
});

router.post('/send-backup', async (req, res, next) => {
	try {
		const uid = req.headers.uid;
		const backupType = req.body.backup_type;

		if (backupType && (backupType === 'lmmoa' || backupType === 'msc')) {
			getAuth()
				.getUser(uid)
				.then(async () => {
					const data = {
						[backupType]: {
							backup_data: req.body.backup_data,
							backup_date: req.body.backup_date,
							backup_device: req.body.backup_device,
						},
					};

					await db
						.collection('user_backup')
						.doc(uid)
						.set(data, { merge: true });

					res.locals.type = 'info';
					res.locals.message = `backup sent successfully`;

					res.status(200).json({ message: 'OK' });
				})
				.catch((err) => {
					next(err);
				});
		} else {
			res.locals.type = 'warn';
			res.locals.message = `some of the required information are missing to send the backup`;
			res.status(400).send(JSON.stringify({ message: 'BAD_REQUEST' }));
		}
	} catch (err) {
		next(err);
	}
});

export default router;
