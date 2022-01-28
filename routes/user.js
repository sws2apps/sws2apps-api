// app dependencies
const express = require('express');
const fetch = require('node-fetch');
const { body, validationResult } = require('express-validator');
const { getAuth } = require('firebase-admin/auth');
const requestIp = require('request-ip');

// load middleware
const authChecker = require('../middleware/auth-checker');

// load local utils
const updateTracker = require('../utils/updateTracker');
const { sendVerificationEmail } = require('../utils/sendEmail');

const router = express.Router();

// without middleware
router.post('/login', async (req, res) => {
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});

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
				res
					.status(data.error.code)
					.send(JSON.stringify({ message: data.error.message }));
			} else {
				const uid = data.localId;

				getAuth()
					.getUser(uid)
					.then((userRecord) => {
						if (userRecord.emailVerified) {
							res
								.status(200)
								.send(JSON.stringify({ message: uid, verified: true }));
						} else {
							res.status(200).send(JSON.stringify({ message: 'NOT_VERIFIED' }));
						}
					})
					.catch(() => {
						res
							.status(500)
							.send(JSON.stringify({ message: 'Internal server error' }));
					});
			}
		})
		.catch(() => {
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
		res.on('finish', async () => {
			const clientIp = requestIp.getClientIp(req);
			await updateTracker(clientIp, { reqInProgress: false });
		});

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			res.status(400).send(
				JSON.stringify({
					message: 'Bad request: provided inputs are invalid.',
				})
			);
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
						res.status(200).send(JSON.stringify({ message: 'CHECK_EMAIL' }));
					})
					.catch(() => {
						res.status(200).send(JSON.stringify({ message: 'VERIFY_FAILED' }));
					});
			})
			.catch((error) => {
				if (error.errorInfo) {
					if (error.errorInfo.code === 'app/network-error') {
						res.status(504).send(
							JSON.stringify({
								message: 'Your request has timed out due to network issue.',
							})
						);
					} else if (error.errorInfo.code === 'auth/email-already-exists') {
						res.status(403).send(
							JSON.stringify({
								message:
									'The email address is already in use by another account.',
							})
						);
					}

					return;
				}
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
		res.on('finish', async () => {
			const clientIp = requestIp.getClientIp(req);
			await updateTracker(clientIp, { reqInProgress: false });
		});

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			res.status(400).send(
				JSON.stringify({
					message: 'Bad request: provided inputs are invalid.',
				})
			);
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
									res
										.status(200)
										.send(JSON.stringify({ message: 'CHECK_EMAIL' }));
								})
								.catch(() => {
									res
										.status(200)
										.send(JSON.stringify({ message: 'VERIFY_FAILED' }));
								});
						})
						.catch(() => {
							res
								.status(500)
								.send(JSON.stringify({ message: 'Internal server error' }));
						});
				}
			})
			.catch(() => {
				res
					.status(500)
					.send(JSON.stringify({ message: 'Internal server error' }));
			});
	}
);

// with middleware
router.use(authChecker());

router.get('/get-backup', async (req, res) => {
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});

	const uid = req.headers.uid;
	getAuth()
		.getUser(uid)
		.then(async () => {
			const userRef = db.collection('user_backup').doc(uid);
			const docSnap = await userRef.get();

			if (docSnap.exists) {
				if (docSnap.data().lmmoa) {
					res
						.status(200)
						.send(JSON.stringify({ message: docSnap.data().lmmoa }));
				} else {
					res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
				}
			} else {
				res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
			}
		})
		.catch(() => {
			res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
		});
});

router.post('/send-backup', async (req, res) => {
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});

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
				res.status(200).send(JSON.stringify({ message: 'OK' }));
			})
			.catch(() => {
				res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
			});
	} else {
		res.status(400).send(JSON.stringify({ message: 'BAD_REQUEST' }));
	}
});

module.exports = router;
