// dependencies
import express from 'express';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// middlewares
import { visitorChecker } from '../middleware/visitor-checker.js';

// utils import
import { sendVerificationEmail } from '../utils/sendEmail.js';
import { getAnnouncementsClient } from '../utils/announcement-utils.js';
import { getUserInfo } from '../utils/user-utils.js';

// get firestore
const db = getFirestore(); //get default database

const router = express.Router();

// without auth middleware
router.post(
	'/create-account',
	body('fullname').isLength({ min: 3 }),
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

			const { fullname, email, password } = req.body;

			getAuth()
				.createUser({
					email: email,
					emailVerified: false,
					password: password,
					disabled: false,
				})
				.then((userRecord) => {
					const userEmail = userRecord.email;
					getAuth()
						.generateEmailVerificationLink(userEmail)
						.then(async (link) => {
							sendVerificationEmail(userEmail, fullname, link);

							const data = {
								about: {
									name: fullname,
									role: 'vip',
									user_uid: userEmail,
								},
							};

							await db.collection('users').add(data);

							res.locals.type = 'info';
							res.locals.message = `user account created and the verification email queued for sending`;
							res.status(200).json({ message: 'CHECK_EMAIL' });
						})
						.catch(() => {
							res.locals.type = 'warn';
							res.locals.message = `user account created, but the verification email could not be sent`;
							res.status(200).json({ message: 'VERIFY_FAILED' });
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

// get announcements
router.get('/announcement', async (req, res, next) => {
	try {
		const announcements = await getAnnouncementsClient();

		res.locals.type = 'info';
		res.locals.message = `client fetched announcements`;

		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
});

router.use(visitorChecker());

router.get('/validate-me', async (req, res, next) => {
	try {
		const { email } = req.headers;
		const { cong_id, cong_name, cong_number, cong_role } = await getUserInfo(
			email
		);

		if (cong_name.length > 0) {
			let obj = { cong_id, cong_name, cong_number, cong_role };

			res.locals.type = 'info';
			res.locals.message = 'visitor id has been validated';

			res.status(200).json(obj);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'email address not associated with a congregation';

			res.status(404).json({ message: 'CONG_NOT_FOUND' });
		}
	} catch (err) {
		next(err);
	}
});

router.get('/resend-verification', async (req, res, next) => {
	try {
		const { email } = req.headers;

		getAuth()
			.generateEmailVerificationLink(email)
			.then((link) => {
				sendVerificationEmail(email, link);

				res.locals.type = 'info';
				res.locals.message = `new verification email queued for sending`;

				res.status(200).json({ message: 'CHECK_EMAIL' });
			})
			.catch(() => {
				res.locals.type = 'warn';
				res.locals.message = `new verification email could not be sent`;

				res.status(200).json({ message: 'VERIFY_FAILED' });
			});
	} catch (err) {
		next(err);
	}
});

export default router;
