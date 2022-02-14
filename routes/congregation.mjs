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
import { congregationAuthChecker } from '../middleware/congregation-auth-checker.js';

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

router.use(congregationAuthChecker());

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

			// should be valid after middleware
			res.locals.type = 'info';
			res.locals.message = 'user successfully logged into congregation';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/change-password',
	body('cong_id').isNumeric().isLength({ min: 10 }),
	body('cong_password').isLength({ min: 8 }),
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

			// should be valid after middleware check
			const congID = req.body.cong_id;
			const congPasswordNew = req.body.cong_password_new;
			const congName = req.body.cong_name;
			const congNumber = req.body.cong_number;

			const saltRounds = +process.env.SALT_ROUNDS;
			bcrypt.genSalt(saltRounds, (err, salt) => {
				bcrypt.hash(congPasswordNew, salt, async (err, hash) => {
					// valid and update VIP and pocket users

					let vipNewUsers = [];
					let vipUsers = res.locals.vipUsers;
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
		} catch (err) {
			next(err);
		}
	}
);

export default router;
