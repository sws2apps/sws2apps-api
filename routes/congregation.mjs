// dependencies
import express from 'express';
import bcrypt from 'bcrypt';
import Cryptr from 'cryptr';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// middleware import
import { authChecker } from '../middleware/auth-checker.mjs';

// get firestore
const db = getFirestore();

const router = express.Router();
router.use(authChecker());

router.get('/generate-id', async (req, res, next) => {
	try {
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

		res.locals.type = 'info';
		res.locals.message = `congregation ID generated successfully`;
		res.status(200).json({ message: num });
	} catch (err) {
		next(err);
	}
});

router.post(
	'/create-account',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password').isLength({ min: 8 }),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
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
								pocketUsers: [],
								vipUsers: [encryptedData],
							};
							await db
								.collection('congregation_data')
								.doc(congID.toString())
								.set(data);

							if (process.env.NODE_ENV === 'testing') {
								await db
									.collection('congregation_data')
									.doc(congID.toString())
									.delete();
							}

							res.status(200).json({ message: 'OK' });
						});
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

router.post(
	'/signin',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password').isLength({ min: 8 }),
	body('cong_name').notEmpty(),
	body('cong_number').isInt(),
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

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
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
									// valid and update congregation name, number

									const data = {
										congName: congName,
										congNumber: congNumber,
									};
									await db
										.collection('congregation_data')
										.doc(congID.toString())
										.set(data, { merge: true });

									res.locals.type = 'info';
									res.locals.message =
										'user successfully logged into congregation';
									res.status(200).json({ message: 'OK' });
								} else {
									// forbbiden
									res.locals.type = 'warn';
									res.locals.message =
										'user do not have access to access that congregation';
									res.status(403).json({ message: 'FORBIDDEN' });
								}
							} else {
								// wrong password
								res.locals.type = 'warn';
								res.locals.message =
									'access denied because congregation password is incorrect.';
								res.status(403).json({ message: 'FORBIDDEN' });
							}
						});
					} else {
						// congregation id not found
						res.locals.type = 'warn';
						res.locals.message = 'congregation id could not be found.';
						res.status(404).json({ message: 'NOT_FOUND' });
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
	'/change-password',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password_old').isLength({ min: 8 }),
	body('cong_password_new').isLength({ min: 8 }),
	body('cong_name').notEmpty(),
	body('cong_number').isInt(),
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

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
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
									const saltRounds = +process.env.SALT_ROUNDS;
									bcrypt.genSalt(saltRounds, (err, salt) => {
										bcrypt.hash(congPasswordNew, salt, async (err, hash) => {
											// valid and update VIP and pocket users

											let vipNewUsers = [];
											const myKey = congID + '&sws2apps_' + congPasswordNew;
											const cryptr = new Cryptr(myKey);

											for (let i = 0; i < vipUsers.length; i++) {
												const encryptedData = cryptr.encrypt(vipUsers[i]);
												vipNewUsers.push(encryptedData);
											}

											const data = {
												congName: congName,
												congNumber: congNumber,
												congPassword: hash,
												pocketUsers: [],
												vipUsers: vipNewUsers,
											};
											await db
												.collection('congregation_data')
												.doc(congID.toString())
												.set(data, { merge: true });
											res.locals.type = 'info';
											res.locals.message =
												'congregation password has been changed successfully';
											res.status(200).json({ message: 'OK' });
										});
									});
								} else {
									// forbbiden
									res.locals.type = 'warn';
									res.locals.message =
										'user do not have access to access that congregation';
									res.status(403).json({ message: 'FORBIDDEN' });
								}
							} else {
								// wrong password
								res.locals.type = 'warn';
								res.locals.message =
									'access denied because congregation password is incorrect.';
								res.status(403).json({ message: 'FORBIDDEN' });
							}
						});
					} else {
						// congregation id not found
						res.locals.type = 'warn';
						res.locals.message = 'congregation id could not be found.';
						res.status(404).json({ message: 'NOT_FOUND' });
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

export default router;
