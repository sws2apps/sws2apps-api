// dependencies
import express from 'express';
import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { body, validationResult } from 'express-validator';

// middlewares
import { adminAuthChecker } from '../middleware/admin-auth-checker.mjs';
import {
	sendCongregationAccountCreated,
	sendCongregationAccountDisapproved,
} from '../utils/sendEmail.mjs';

// get firestore
const db = getFirestore();

const router = express.Router();

router.use(adminAuthChecker());

router.post('/login', async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged in';
		res.status(200).json({ message: 'ADMIN_LOGGED' });
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
			const uid = userRecord.uid;
			const emailVerified = userRecord.emailVerified;

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

			obj.uid = uid;
			obj.email = tmpUsers[i].email;
			obj.emailVerified = emailVerified;
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

export default router;
