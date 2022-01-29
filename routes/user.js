// app dependencies
const express = require('express');
const fetch = require('node-fetch');
const { body, validationResult } = require('express-validator');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore'); //load firestore SDK

// get firestore
const db = getFirestore(); //get default database

// load middleware
const internetChecker = require('../middleware/internet-checker');
const authChecker = require('../middleware/auth-checker');

// load local utils
const { sendVerificationEmail } = require('../utils/sendEmail');

const router = express.Router();
router.use(internetChecker());

// without auth middleware
router.post('/login', async (req, res) => {
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
				res
					.status(data.error.code)
					.send(JSON.stringify({ message: data.error.message }));
			} else {
				const uid = data.localId;

				getAuth()
					.getUser(uid)
					.then((userRecord) => {
						if (userRecord.emailVerified) {
							res.locals.type = 'info';
							res.locals.message = 'user success login';
							res
								.status(200)
								.send(JSON.stringify({ message: uid, verified: true }));
						} else {
							res.locals.type = 'warn';
							res.locals.message = 'user account not verified';
							res.status(200).send(JSON.stringify({ message: 'NOT_VERIFIED' }));
						}
					})
					.catch((err) => {
						res.locals.type = 'warn';
						res.locals.message = `user failed to login: ${err.message}`;
						res
							.status(500)
							.send(JSON.stringify({ message: 'Internal server error' }));
					});
			}
		})
		.catch((err) => {
			res.locals.type = 'warn';
			res.locals.message = err.message;
			res
				.status(500)
				.send(JSON.stringify({ message: 'Internal server error' }));
		});
});

router.post(
	'/create-account',
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	async (req, res) => {
		res.on('error', () => {
			console.log('error');
		});
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).send(
				JSON.stringify({
					message: 'Bad request: provided inputs are invalid.',
				})
			);

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
					.then((link) => {
						sendVerificationEmail(userEmail, link);

						res.locals.type = 'info';
						res.locals.message = `user account created and the verification email queued for sending`;
						res.status(200).send(JSON.stringify({ message: 'CHECK_EMAIL' }));
					})
					.catch(() => {
						res.locals.type = 'warn';
						res.locals.message = `user account created, but the verification email could not be sent`;
						res.status(200).send(JSON.stringify({ message: 'VERIFY_FAILED' }));
					});
			})
			.catch((error) => {
				if (error.errorInfo) {
					if (error.errorInfo.code === 'app/network-error') {
						res.locals.type = 'warn';
						res.locals.message = `request timed out due to network issue`;

						res.status(504).send(
							JSON.stringify({
								message: 'Your request has timed out due to network issue.',
							})
						);
					} else if (error.errorInfo.code === 'auth/email-already-exists') {
						res.locals.type = 'warn';
						res.locals.message = `the email address is already in use`;

						res.status(403).send(
							JSON.stringify({
								message:
									'The email address is already in use by another account.',
							})
						);
					}

					return;
				}

				res.locals.type = 'warn';
				res.locals.message = `an error occured: ${error}`;

				res.status(500).send(
					JSON.stringify({
						message: 'An internal server error occured. Try again later.',
					})
				);
			});
	}
);

router.post(
	'/resend-verification',
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	async (req, res) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).send(
				JSON.stringify({
					message: 'Bad request: provided inputs are invalid.',
				})
			);

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

					res
						.status(data.error.code)
						.send(JSON.stringify({ message: data.error.message }));
				} else {
					const uid = data.localId;

					getAuth()
						.getUser(uid)
						.then((userRecord) => {
							const userEmail = userRecord.email;
							getAuth()
								.generateEmailVerificationLink(userEmail)
								.then((link) => {
									sendVerificationEmail(userEmail, link);

									res.locals.type = 'info';
									res.locals.message = `new verification email queued for sending`;

									res
										.status(200)
										.send(JSON.stringify({ message: 'CHECK_EMAIL' }));
								})
								.catch(() => {
									res.locals.type = 'warn';
									res.locals.message = `new verification email could not be sent`;

									res
										.status(200)
										.send(JSON.stringify({ message: 'VERIFY_FAILED' }));
								});
						})
						.catch((err) => {
							res.locals.type = 'warn';
							res.locals.message = `failed to send new verification email: ${err.message}`;

							res
								.status(500)
								.send(JSON.stringify({ message: 'Internal server error' }));
						});
				}
			})
			.catch((err) => {
				res.locals.type = 'warn';
				res.locals.message = `failed to send new verification email: ${err.message}`;

				res
					.status(500)
					.send(JSON.stringify({ message: 'Internal server error' }));
			});
	}
);

// with inline middleware
router.get('/get-backup', authChecker, async (req, res) => {
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
					res
						.status(200)
						.send(JSON.stringify({ message: docSnap.data().lmmoa }));
				} else {
					res.locals.type = 'info';
					res.locals.message = `the user has no backup`;
					res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
				}
			} else {
				res.locals.type = 'info';
				res.locals.message = `the user has no backup`;
				res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
			}
		})
		.catch((err) => {
			res.locals.type = 'warn';
			res.locals.message = `an error occured while retrieving backup: ${err.message}`;

			res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
		});
});

router.post('/send-backup', authChecker, async (req, res) => {
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

				await db.collection('user_backup').doc(uid).set(data, { merge: true });

				res.locals.type = 'info';
				res.locals.message = `backup sent successfully`;

				res.status(200).send(JSON.stringify({ message: 'OK' }));
			})
			.catch((err) => {
				res.locals.type = 'warn';
				res.locals.message = `an error occured while retrieving backup: ${err.message}`;

				res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
			});
	} else {
		res.locals.type = 'warn';
		res.locals.message = `some of the required information are missing to send the backup`;
		res.status(400).send(JSON.stringify({ message: 'BAD_REQUEST' }));
	}
});

module.exports = router;
