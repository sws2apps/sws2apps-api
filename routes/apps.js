// app dependencies
const express = require('express');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
const Cryptr = require('cryptr');
const { body, validationResult } = require('express-validator');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const requestIp = require('request-ip');
const updateTracker = require('../utils/updateTracker');

require('../firebase-config'); //load firebase admin
const db = getFirestore();

const router = express.Router();

const oAuth = async (req, res, next) => {
	const uid = req.headers.uid;
	if (uid) {
		getAuth()
			.getUser(uid)
			.then(() => {
				next();
			})
			.catch(() => {
				res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
			});
	} else {
		res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
	}

	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});
};

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
							const userEmail = userRecord.email;

							getAuth()
								.generateEmailVerificationLink(userEmail)
								.then((link) => {
									res.status(200).send(JSON.stringify({ message: link }));
								})
								.catch(() => {
									res
										.status(200)
										.send(JSON.stringify({ message: 'VERIFY_FAILED' }));
								});
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
						res.status(200).send(JSON.stringify({ message: link }));
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

router.get('/generate-congregation-id', oAuth, async (req, res) => {
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});

	let setID = false;
	let num;

	do {
		const min = 1000000000;
		const max = 9999999999;
		num = Math.floor(Math.random() * (max - min + 1)) + min;

		const congRef = db.collection('congregation_data').doc(num.toString());
		const docSnap = await congRef.get();

		if (!docSnap.exists) {
			setID = true;
		}
	} while (setID === false);

	res.status(200).send(JSON.stringify({ message: num }));
});

router.post(
	'/create-congregation-account',
	oAuth,
	body('cong_id').isLength({ min: 10 }),
	body('cong_password').isLength({ min: 8 }),
	body('cong_name').notEmpty(),
	body('cong_number').isInt(),
	async (req, res) => {
		res.on('finish', async () => {
			const clientIp = requestIp.getClientIp(req);
			await updateTracker(clientIp, { reqInProgress: false });
		});

		if (req.headers.uid) {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				res.status(400).send(JSON.stringify({ message: 'INPUT_INVALID' }));
			}

			const uid = req.headers.uid;
			getAuth()
				.getUser(uid)
				.then((userRecord) => {
					const email = userRecord.email;
					const congID = req.body.cong_id;
					const congPassword = req.body.cong_password;
					const congName = req.body.cong_name;
					const congNumber = req.body.cong_number;

					const myKey = congID + '&sws2apps_' + congPassword;
					const cryptr = new Cryptr(myKey);
					const encryptedData = cryptr.encrypt(email);

					const saltRounds = +process.env.SALT_ROUNDS;
					bcrypt.genSalt(saltRounds, (err, salt) => {
						bcrypt.hash(congPassword, salt, async (err, hash) => {
							const data = {
								congName: congName,
								congNumber: congNumber,
								congPassword: hash,
								vipUsers: [encryptedData],
							};
							await db
								.collection('congregation_data')
								.doc(congID.toString())
								.set(data);
							res.status(200).send(JSON.stringify({ message: 'OK' }));
						});
					});
				})
				.catch(() => {
					res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
				});
		} else {
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	}
);

router.get('/user/get-backup', oAuth, async (req, res) => {
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

module.exports = router;
