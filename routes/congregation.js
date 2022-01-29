// app dependencies
const express = require('express');
const bcrypt = require('bcrypt');
const Cryptr = require('cryptr');
const { body, validationResult } = require('express-validator');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const requestIp = require('request-ip');

// load middleware
const internetChecker = require('../middleware/internet-checker');
const authChecker = require('../middleware/auth-checker');

// load local utils
const updateTracker = require('../utils/updateTracker');

// get firestore
const db = getFirestore();

const router = express.Router();
router.use(internetChecker());
router.use(authChecker());

router.get('/generate-id', async (req, res) => {
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

	res.locals.type = 'info';
	res.locals.message = `congregation ID generated successfully`;
	res.status(200).send(JSON.stringify({ message: num }));
});

router.post(
	'/create-account',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password').isLength({ min: 8 }),
	body('cong_name').notEmpty(),
	body('cong_number').isInt(),
	async (req, res) => {
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

router.post(
	'/signin',
	body('cong_id').isNumeric().isLength({ min: 10 }),
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
				.then(async (userRecord) => {
					const email = userRecord.email;
					const congID = req.body.cong_id;
					const congPassword = req.body.cong_password;
					const congName = req.body.cong_name;
					const congNumber = req.body.cong_number;

					const congRef = db
						.collection('congregation_data')
						.doc(congID.toString());
					const docSnap = await congRef.get();

					if (docSnap.exists) {
						// check password
						const hashedPwd = docSnap.data().congPassword;
						bcrypt.compare(congPassword, hashedPwd, async (err, result) => {
							if (err) {
								// error while comparing hash
								res
									.status(500)
									.send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
							}
							if (result) {
								// check if email can access congregation data
								const vipUsersEncrypted = docSnap.data().vipUsers;
								let vipUsers = [];

								const myKey = congID + '&sws2apps_' + congPassword;
								const cryptr = new Cryptr(myKey);

								for (let i = 0; i < vipUsersEncrypted.length; i++) {
									const decryptedData = cryptr.decrypt(vipUsersEncrypted[i]);
									vipUsers.push(decryptedData);
								}

								const userIndex = vipUsers.findIndex((user) => user === email);
								if (userIndex >= 0) {
									// valid and update congregation name and number
									const data = {
										congName: congName,
										congNumber: congNumber,
									};
									await db
										.collection('congregation_data')
										.doc(congID.toString())
										.set(data, { merge: true });
									res.status(200).send(JSON.stringify({ message: 'OK' }));
								} else {
									// forbbiden
									res
										.status(403)
										.send(JSON.stringify({ message: 'FORBIDDEN' }));
								}
							} else {
								// wrong password
								res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
							}
						});
					} else {
						// congregation id not found
						res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
					}
				})
				.catch(() => {
					res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
				});
		} else {
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	}
);

router.post(
	'/change-password',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password_old').isLength({ min: 8 }),
	body('cong_password_new').isLength({ min: 8 }),
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
				.then(async (userRecord) => {
					const email = userRecord.email;
					const congID = req.body.cong_id;
					const congPasswordOld = req.body.cong_password_old;
					const congPasswordNew = req.body.cong_password_new;
					const congName = req.body.cong_name;
					const congNumber = req.body.cong_number;

					const congRef = db
						.collection('congregation_data')
						.doc(congID.toString());
					const docSnap = await congRef.get();

					if (docSnap.exists) {
						// check password
						const hashedPwd = docSnap.data().congPassword;
						bcrypt.compare(congPasswordOld, hashedPwd, async (err, result) => {
							if (err) {
								// error while comparing hash
								res
									.status(500)
									.send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
							}
							if (result) {
								// check if email can access congregation data
								const vipUsersEncrypted = docSnap.data().vipUsers;
								let vipUsers = [];

								const myKey = congID + '&sws2apps_' + congPasswordOld;
								const cryptr = new Cryptr(myKey);

								for (let i = 0; i < vipUsersEncrypted.length; i++) {
									const decryptedData = cryptr.decrypt(vipUsersEncrypted[i]);
									vipUsers.push(decryptedData);
								}

								const userIndex = vipUsers.findIndex((user) => user === email);
								if (userIndex >= 0) {
									// valid

									const saltRounds = +process.env.SALT_ROUNDS;
									bcrypt.genSalt(saltRounds, (err, salt) => {
										bcrypt.hash(congPasswordNew, salt, async (err, hash) => {
											const data = {
												congName: congName,
												congNumber: congNumber,
												congPassword: hash,
											};
											await db
												.collection('congregation_data')
												.doc(congID.toString())
												.set(data, { merge: true });
											res.status(200).send(JSON.stringify({ message: 'OK' }));
										});
									});
								} else {
									// forbbiden
									res
										.status(403)
										.send(JSON.stringify({ message: 'FORBIDDEN' }));
								}
							} else {
								// wrong password
								res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
							}
						});
					} else {
						// congregation id not found
						res.status(404).send(JSON.stringify({ message: 'NOT_FOUND' }));
					}
				})
				.catch(() => {
					res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
				});
		} else {
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	}
);

module.exports = router;
