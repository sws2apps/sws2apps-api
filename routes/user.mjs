// dependencies
import express from 'express';
import fetch from 'node-fetch';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// middleware import
import { authChecker } from '../middleware/auth-checker.mjs';

// utils import
import { sendVerificationEmail } from '../utils/sendEmail.mjs';

// get firestore
const db = getFirestore(); //get default database

const router = express.Router();

// without auth middleware
router.post('/login', async (req, res, next) => {
	try {
		const googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

		fetch(googleKit, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...req.body,
			}),
		})
			.then(async (response) => {
				const data = await response.json();
				if (data.error) {
					res.locals.failedLoginAttempt = true;
					res.locals.type = 'warn';
					res.locals.message = `user failed to login: ${data.error.message}`;
					res.status(data.error.code).json({ message: data.error.message });
				} else {
					const uid = data.localId;

					getAuth()
						.getUser(uid)
						.then(async (userRecord) => {
							if (userRecord.emailVerified) {
								res.locals.type = 'info';
								res.locals.message = 'user success login';
								res.status(200).json({ message: uid, verified: true });
							} else {
								res.locals.type = 'warn';
								res.locals.message = 'user account not verified';
								res.status(200).json({ message: 'NOT_VERIFIED' });
							}
						});
				}
			})
			.catch((err) => {
				next(err);
			});
	} catch (err) {
		next(err);
	}
});

router.post(
	'/create-account',
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
					if (process.env.NODE_ENV === 'testing') {
						const uid = userRecord.uid;
						getAuth()
							.deleteUser(uid)
							.then(() => {
								res.status(200).json({ message: 'ACCOUNT_CREATED' });
							});
					} else {
						const userEmail = userRecord.email;
						getAuth()
							.generateEmailVerificationLink(userEmail)
							.then((link) => {
								if (process.env.NODE_ENV !== 'testing') {
									sendVerificationEmail(userEmail, link);
								}

								res.locals.type = 'info';
								res.locals.message = `user account created and the verification email queued for sending`;
								res.status(200).json({ message: 'CHECK_EMAIL' });
							})
							.catch(() => {
								res.locals.type = 'warn';
								res.locals.message = `user account created, but the verification email could not be sent`;
								res.status(200).json({ message: 'VERIFY_FAILED' });
							});
					}
				})
				.catch((err) => {
					next(err);
				});
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/resend-verification',
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

			const googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

			fetch(googleKit, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...req.body,
				}),
			})
				.then(async (response) => {
					const data = await response.json();
					if (data.error) {
						res.locals.type = 'warn';
						res.locals.message = `failed to resend verification message: ${data.error.message}`;

						res.status(data.error.code).json({ message: data.error.message });
					} else {
						const uid = data.localId;

						getAuth()
							.getUser(uid)
							.then((userRecord) => {
								const userEmail = userRecord.email;
								getAuth()
									.generateEmailVerificationLink(userEmail)
									.then((link) => {
										if (process.env.NODE_ENV !== 'testing') {
											sendVerificationEmail(userEmail, link);
										}

										res.locals.type = 'info';
										res.locals.message = `new verification email queued for sending`;

										res.status(200).json({ message: 'CHECK_EMAIL' });
									})
									.catch(() => {
										res.locals.type = 'warn';
										res.locals.message = `new verification email could not be sent`;

										res.status(200).json({ message: 'VERIFY_FAILED' });
									});
							})
							.catch((err) => {
								res.locals.type = 'warn';
								res.locals.message = `failed to send new verification email: ${err.message}`;

								res.status(500).json({ message: 'Internal server error' });
							});
					}
				})
				.catch((err) => {
					next(err);
				});
		} catch (err) {
			next(err);
		}
	}
);

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
