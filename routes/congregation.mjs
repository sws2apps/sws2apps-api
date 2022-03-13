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
import { congregationAuthChecker } from '../middleware/congregation-auth-checker.mjs';

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
	'/request-account',
	body('email').isEmail(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			let requests = [];

			const congRef = db.collection('congregation_request');
			const snapshot = await congRef.get();

			snapshot.forEach((doc) => {
				let obj = {};
				obj.id = doc.id;
				obj.data = doc.data();
				requests.push(obj);
			});

			requests.sort((a, b) => {
				return a.id > b.id ? 1 : -1;
			});

			const findIndex = requests.findIndex(
				(request) => request.data.email === req.body.email
			);

			if (findIndex > -1) {
				res.locals.type = 'warn';
				res.locals.message = 'user already has a pending request';
				res.status(403).json({ message: 'REQUEST_EXIST' });
			} else {
				const lastReq = requests[0];
				let newReq = '';

				if (lastReq) {
					let lastId = lastReq.id.split('-')[1];
					newReq = `RQ-${+lastId + 1}`;
				} else {
					newReq = 'RQ-100000';
				}

				const data = {
					email: req.body.email,
					cong_name: req.body.cong_name,
					cong_number: +req.body.cong_number,
				};

				await db
					.collection('congregation_request')
					.doc(newReq.toString())
					.set(data);

				res.locals.type = 'info';
				res.locals.message = 'congregation request sent for approval';
				res.status(200).json({ message: 'OK' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.use(congregationAuthChecker());

router.post('/signin', async (req, res, next) => {
	try {
		// should be valid after middleware
		res.locals.type = 'info';
		res.locals.message = 'user successfully logged into congregation';
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
});

router.post(
	'/change-password',
	body('cong_password_new').isLength({ min: 8 }),
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

router.post('/pocket-generate-pin', async (req, res, next) => {
	try {
		// should be a valid request and generate user PIN
		const congID = req.body.cong_id;
		const congRef = db.collection('congregation_data').doc(congID.toString());
		const docSnap = await congRef.get();
		const pocketUsers = docSnap.data().pocketUsers || [];

		let setPIN = false;
		let num;

		do {
			const min = 100000;
			const max = 1000000;

			num = crypto.randomInt(min, max);

			const pinIndex = pocketUsers.findIndex((pocket) => pocket.PIN === num);
			if (pinIndex === -1) {
				setPIN = true;
			}
		} while (setPIN === false);

		res.locals.type = 'info';
		res.locals.message = `user PIN generated successfully`;
		res.status(200).json({ message: num });
	} catch (err) {
		next(err);
	}
});

router.post('/pocket-edit-user', async (req, res, next) => {
	try {
		// check needed content outside middleware
		const {
			cong_id,
			user_pin,
			user_pinPrev,
			user_members,
			pocket_type,
			app_client,
		} = req.body;
		const userPIN = +user_pin;

		if (
			userPIN > 0 &&
			app_client === 'lmmoa' &&
			(pocket_type === 'new' ||
				pocket_type === 'update' ||
				pocket_type === 'update-pin' ||
				pocket_type === 'link')
		) {
			const userMembers = Array(user_members) ? user_members : [];
			const congID = cong_id;
			const congRef = db.collection('congregation_data').doc(congID.toString());
			const docSnap = await congRef.get();
			let pocketUsers = docSnap.data().pocketUsers || [];

			// finding PIN index
			let pocketIndex = pocketUsers.findIndex(
				(pocket) => pocket.PIN === userPIN
			);

			if (pocket_type === 'new') {
				if (pocketIndex === -1) {
					let obj = {};
					obj.PIN = userPIN;
					obj[app_client] = userMembers;
					pocketUsers.push(obj);

					const data = {
						pocketUsers: pocketUsers,
					};

					await db
						.collection('congregation_data')
						.doc(congID.toString())
						.set(data, { merge: true });

					res.locals.type = 'info';
					res.locals.message = `sws pocket user added successfully to congregation`;
					res.status(200).json({ message: 'OK' });
				} else {
					res.locals.type = 'warn';
					res.locals.message = `pin already used by another member`;
					res.status(403).json({ message: 'PIN_IN_USE' });
				}
			} else {
				if (pocketIndex === -1 && pocket_type !== 'update-pin') {
					res.locals.type = 'warn';
					res.locals.message = `pin could not be found`;
					res.status(403).json({ message: 'NOT_FOUND' });
				} else {
					// removing old PIN
					const previousPIN = +user_pinPrev || userPIN;
					const prevIndex = pocketUsers.findIndex(
						(pocket) => pocket.PIN === previousPIN
					);

					if (prevIndex > -1) {
						pocketUsers.splice(prevIndex, 1);
					}

					let obj = {};
					obj.PIN = userPIN;
					obj[app_client] = userMembers;
					pocketUsers.push(obj);

					const data = {
						pocketUsers: pocketUsers,
					};

					await db
						.collection('congregation_data')
						.doc(congID.toString())
						.set(data, { merge: true });

					if (pocket_type === 'update' || pocket_type === 'update-pin') {
						res.locals.type = 'info';
						res.locals.message = `sws pocket user successfully updated`;
						res.status(200).json({ message: 'OK' });
					} else if (pocket_type === 'link') {
						res.locals.type = 'info';
						res.locals.message = `sws pocket user successfully updated and linked to an existing pin`;
						res.status(200).json({ message: 'OK' });
					}
				}
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = `input invalid that prevents adding sws pocket user`;

			res.status(400).json({ message: 'INPUT_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

router.post('/pocket-remove-user', async (req, res, next) => {
	try {
		// check needed content outside middleware
		const { cong_id, user_pin, app_client } = req.body;
		const userPIN = +user_pin;

		if (userPIN > 0 && app_client === 'lmmoa') {
			const congID = cong_id;
			const congRef = db.collection('congregation_data').doc(congID.toString());
			const docSnap = await congRef.get();
			let pocketUsers = docSnap.data().pocketUsers || [];

			const pocketIndex = pocketUsers.findIndex(
				(pocket) => pocket.PIN === userPIN
			);

			if (pocketIndex === -1) {
				res.locals.type = 'warn';
				res.locals.message = `user pin could not be found`;
				res.status(200).json({ message: 'OK' });
			} else {
				pocketUsers.splice(pocketIndex, 1);
				const data = {
					pocketUsers: pocketUsers,
				};

				await db
					.collection('congregation_data')
					.doc(congID.toString())
					.set(data, { merge: true });

				res.locals.type = 'info';
				res.locals.message = `user removed from sws pocket`;
				res.status(200).json({ message: 'OK' });
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = `input invalid that prevents removing sws pocket user`;

			res.status(400).json({ message: 'INPUT_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

router.post('/pocket-send-schedule', async (req, res, next) => {
	try {
		// check needed content outside middleware
		const { cong_id, cong_password, pocket_data, pocket_schedule } = req.body;

		if (pocket_data && pocket_schedule) {
			const congID = cong_id;
			const congPassword = cong_password;

			const myKey = congID + '&sws2apps';
			const cryptr = new Cryptr(myKey);
			const encryptedData = cryptr.encrypt(pocket_data);

			const congRef = db.collection('congregation_data').doc(congID.toString());
			const docSnap = await congRef.get();
			let lmmoaPocket = docSnap.data().lmmoaPocket || [];

			const prevIndex = lmmoaPocket.findIndex(
				(lmmoa) => lmmoa.schedule === pocket_schedule
			);

			if (prevIndex > -1) {
				lmmoaPocket.splice(prevIndex, 1);
			}

			const obj = {};
			obj.schedule = pocket_schedule;
			obj.data = encryptedData;

			lmmoaPocket.push(obj);

			const data = {
				lmmoaPocket: lmmoaPocket,
			};

			await db
				.collection('congregation_data')
				.doc(congID.toString())
				.set(data, { merge: true });

			res.locals.type = 'info';
			res.locals.message = `schedule published successfully to sws pocket`;
			res.status(200).json({ message: 'OK' });
		} else {
			res.locals.type = 'warn';
			res.locals.message = `input invalid that prevents publishing the schedule`;

			res.status(400).json({ message: 'INPUT_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

export default router;
