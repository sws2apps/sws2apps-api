// dependencies
import express from 'express';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

// middleware import
import { visitorChecker } from '../middleware/visitor-checker.js';

// utils
import {
	findCongregationRequestByEmail,
	getCongregationInfo,
} from '../utils/congregation-utils.js';
import { encryptData } from '../utils/encryption-utils.js';
import { sendCongregationRequest } from '../utils/sendEmail.js';
import { getUserInfo } from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

const router = express.Router();

router.use(visitorChecker());

router.put(
	'/',
	body('email').isEmail(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('app_requestor').notEmpty(),
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

			const { email, cong_name, cong_number, app_requestor } = req.body;

			if (app_requestor !== 'lmmo') {
				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${app_requestor}`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			const userRequest = await findCongregationRequestByEmail(email);

			if (userRequest) {
				res.locals.type = 'warn';
				res.locals.message = 'user can only make one request';
				res.status(405).json({ message: 'REQUEST_EXIST' });

				return;
			}

			const data = {
				email: email,
				cong_name: cong_name,
				cong_number: +cong_number,
				cong_role: app_requestor,
				request_date: new Date(),
				approved: false,
				request_open: true,
			};

			await db.collection('congregation_request').add(data);

			const userInfo = await getUserInfo(email);
			sendCongregationRequest(cong_name, cong_number, userInfo.username);

			res.locals.type = 'info';
			res.locals.message = 'congregation request sent for approval';
			res.status(200).json({ message: 'OK' });
		} catch (err) {
			next(err);
		}
	}
);

router.get('/:id/last-backup', async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				if (cong.last_backup) {
					res.locals.type = 'info';
					res.locals.message =
						'user get the latest backup info for the congregation';
					res.status(200).json(cong.last_backup);
				} else {
					res.locals.type = 'info';
					res.locals.message =
						'no backup has been made yet for the congregation';
					res.status(200).json({ message: 'NO_BACKUP' });
				}
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });
	} catch (err) {
		next(err);
	}
});

router.patch(
	'/:id/send-backup',
	body('cong_persons').isArray(),
	body('cong_schedule').isArray(),
	body('cong_sourceMaterial').isArray(),
	async (req, res, next) => {
		try {
			const { id } = req.params;
			const { email } = req.headers;

			if (id) {
				const cong = await getCongregationInfo(id);
				if (cong) {
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

					const { cong_persons, cong_schedule, cong_sourceMaterial } = req.body;

					// encrypt cong_persons data
					const encryptedPersons = encryptData(cong_persons);

					const userInfo = await getUserInfo(email);

					const data = {
						cong_persons: encryptedPersons,
						cong_schedule_draft: cong_schedule,
						cong_sourceMaterial_draft: cong_sourceMaterial,
						last_backup: {
							by: userInfo.id,
							date: new Date(),
						},
					};

					await db
						.collection('congregations')
						.doc(id)
						.set(data, { merge: true });

					res.locals.type = 'info';
					res.locals.message = 'user send backup for congregation successfully';
					res.status(200).json({ message: 'BACKUP_SENT' });
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'no congregation could not be found with the provided id';
					res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'the congregation request id params is undefined';
				res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			}
		} catch (err) {
			next(err);
		}
	}
);

export default router;
