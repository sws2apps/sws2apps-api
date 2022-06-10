// dependencies
import express from 'express';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { body, check, validationResult } from 'express-validator';

// sub-routes
import usersRoute from './admin-users.js';
import congregationsRoute from './admin-congregation.js';

// middlewares
import { visitorChecker } from '../middleware/visitor-checker.js';
import { adminAuthChecker } from '../middleware/admin-auth-checker.js';

// utils
import {
	deleteAnnouncement,
	getAnnouncement,
	getAnnouncements,
	publishAnnouncement,
	saveDraftAnnouncement,
} from '../utils/announcement-utils.js';
import {
	getCongregationRequestInfo,
	generateCongregationID,
	getCongregations,
	getCongregationInfo,
} from '../utils/congregation-utils.js';
import {
	sendCongregationAccountCreated,
	sendCongregationAccountDisapproved,
} from '../utils/sendEmail.js';
import { getUserInfo, getUsers } from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

const router = express.Router();

router.use(visitorChecker());
router.use(adminAuthChecker());

router.use('/congregations', congregationsRoute);
router.use('/users', usersRoute);

router.get('/', async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged in';

		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
});

router.get('/logout', async (req, res, next) => {
	try {
		// remove all sessions
		const { id } = res.locals.currentUser;

		const userRef = db.collection('users').doc(id);
		const userSnap = await userRef.get();

		const aboutUser = userSnap.data().about;

		const data = {
			about: { ...aboutUser, sessions: [] },
		};

		await db.collection('users').doc(id).set(data, { merge: true });

		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged out';
		res.status(200).json({ message: 'LOGGED_OUT' });
	} catch (err) {
		next(err);
	}
});

router.post(
	'/congregation-add-user',
	body('cong_id').isNumeric(),
	body('user_uid').notEmpty(),
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

			const { cong_id, user_uid } = req.body;
			const findUser = await getUserInfo(user_uid);

			if (findUser) {
				const data = {
					congregation: {
						id: +cong_id,
						role: [],
					},
				};

				await db.collection('users').doc(user_uid).set(data, { merge: true });

				const congsList = await getCongregations();

				res.locals.type = 'info';
				res.locals.message = 'member added to congregation';
				res.status(200).json(congsList);
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'user could not be found';
				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/congregation-remove-user',
	body('user_uid').notEmpty(),
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

			// get user ref
			const { user_uid } = req.body;
			const userInfo = await getUserInfo(user_uid);
			if (userInfo) {
				const userRef = db.collection('users').doc(req.body.user_uid);
				const userSnap = await userRef.get();

				const data = {
					about: userSnap.data().about,
				};
				await db.collection('users').doc(req.body.user_uid).set(data);

				const congsList = await getCongregations();

				res.locals.type = 'info';
				res.locals.message = 'member removed to congregation';
				res.status(200).json(congsList);
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'user could not be found';
				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.get('/blocked-requests', async (req, res, next) => {
	try {
		let reqs = [];
		for (let i = 0; i < requestTracker.length; i++) {
			const retryOn = requestTracker[i].retryOn || 0;
			if (retryOn > 0) {
				const currentDate = new Date().getTime();
				if (currentDate < retryOn) {
					reqs.push(requestTracker[i]);
				}
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'admin fetched blocked requests';
		res.status(200).json({ message: reqs });
	} catch (err) {
		next(err);
	}
});

router.post(
	'/unblock-request',
	body('request_ip').notEmpty(),
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

			const ipIndex = requestTracker.findIndex(
				(client) => client.ip === req.body.request_ip
			);

			if (ipIndex === -1) {
				res.locals.type = 'warn';
				res.locals.message = 'failed to unblock request since ip is not valid';
				res.status(400).json({ message: 'UNBLOCK_FAILED' });
			} else {
				requestTracker.splice(ipIndex, 1);
				res.locals.type = 'info';
				res.locals.message = 'request unblocked successfully';
				res.status(200).json({ message: requestTracker });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/user-update-role',
	body('user_uid').notEmpty(),
	body('user_role').isArray(),
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

			const { user_uid, user_role } = req.body;

			// validate provided role
			let isValid = true;
			const allowedRoles = ['admin', 'lmmo', 'view-schedule-meeting'];
			if (user_role > 0) {
				for (let i = 0; i < user_role.length; i++) {
					const role = user_role[i];
					if (!allowedRoles.includes(role)) {
						isValid = false;
						break;
					}
				}
			}

			if (!isValid) {
				res.locals.type = 'warn';
				res.locals.message = `invalid role provided`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			// get user ref
			const userInfo = await getUserInfo(user_uid);
			if (userInfo) {
				const { congregation } = userInfo;

				const data = {
					congregation: {
						...congregation,
						role: user_role,
					},
				};

				await db.collection('users').doc(user_uid).set(data, { merge: true });

				const congsList = await getCongregations();

				res.locals.type = 'info';
				res.locals.message = 'user role updated successfully';
				res.status(200).json(congsList);
			} else {
				res.locals.type = 'warn';
				res.locals.message = `user could not be found`;

				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/find-user',
	body('user_uid').notEmpty(),
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

			const { user_uid } = req.body;

			const userData = await getUserInfo(user_uid);

			if (userData) {
				res.locals.type = 'info';
				res.locals.message = 'user details fetched successfully';
				res.status(200).json(userData);
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'user could not be found';
				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/congregation-delete',
	body('cong_id').notEmpty(),
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

			const { cong_id } = req.body;
			const congData = await getCongregationInfo(cong_id);

			if (congData) {
				// remove congregation from members
				const users = await getUsers();
				const filteredUsers = users.filter((user) => user.cong_id === cong_id);

				for (let i = 0; i < filteredUsers.length; i++) {
					const docID = filteredUsers[i].user_uid;

					const userRef = db.collection('users').doc(docID);
					await userRef.update({ congregation: FieldValue.delete() });
				}

				// delete cong record
				await db
					.collection('congregation_data')
					.doc(cong_id.toString())
					.set({});
				await db
					.collection('congregation_data')
					.doc(cong_id.toString())
					.delete();

				const congs = await getCongregations();

				res.locals.type = 'info';
				res.locals.message = 'congregation deleted successfully';
				res.status(200).json(congs);
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'congregation could not be found';
				res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.get('/announcements', async (req, res, next) => {
	try {
		const announcements = await getAnnouncements();

		res.locals.type = 'info';
		res.locals.message = 'announcements fetched successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
});

router.post(
	'/announcement-save-draft',
	body('announcement').isObject(),
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

			const { announcement } = req.body;
			const announcements = await saveDraftAnnouncement(announcement);

			res.locals.type = 'info';
			res.locals.message = 'draft announcement saved successfully';
			res.status(200).json(announcements);
		} catch (err) {
			next(err);
		}
	}
);

router.get('/announcement', async (req, res, next) => {
	try {
		await check('announcement_id').notEmpty().run(req);

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

		const { announcement_id } = req.headers;
		const announcement = await getAnnouncement(announcement_id);

		if (announcement) {
			res.locals.type = 'info';
			res.locals.message = 'announcement fetched successfully';
			res.status(200).json(announcement);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'announcement could not be found';
			res.status(404).json({ message: 'NOT_FOUND' });
		}
	} catch (err) {
		next(err);
	}
});

router.delete('/announcement', async (req, res, next) => {
	try {
		await check('announcement_id').notEmpty().run(req);

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

		const { announcement_id } = req.headers;
		const announcements = await deleteAnnouncement(announcement_id);

		res.locals.type = 'info';
		res.locals.message = 'announcement deleted successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
});

router.post(
	'/announcement-publish',
	body('announcement').isObject(),
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

			const { announcement } = req.body;
			const announcements = await publishAnnouncement(announcement);

			res.locals.type = 'info';
			res.locals.message = 'announcement published successfully';
			res.status(200).json(announcements);
		} catch (err) {
			next(err);
		}
	}
);

export default router;
