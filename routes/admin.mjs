// dependencies
import express from 'express';
import Cryptr from 'cryptr';
import twofactor from 'node-2fa';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { body, validationResult } from 'express-validator';

// middlewares
import { visitorChecker } from '../middleware/visitor-checker.mjs';
import { adminAuthChecker } from '../middleware/admin-auth-checker.mjs';

// utils
import {
	getCongregationRequestInfo,
	generateCongregationID,
	getCongregations,
	getCongregationInfo,
} from '../utils/congregation-utils.mjs';
import {
	sendCongregationAccountCreated,
	sendCongregationAccountDisapproved,
	sendUserResetPassword,
} from '../utils/sendEmail.mjs';
import { getUserInfo, getUsers } from '../utils/user-utils.mjs';

// get firestore
const db = getFirestore();

const router = express.Router();

router.use(visitorChecker());
router.use(adminAuthChecker());

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
		const data = {
			about: { ...res.locals.userAbout, sessions: [] },
		};

		const email = res.locals.currentUser.email;
		await db.collection('users').doc(email).set(data, { merge: true });

		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged out';
		res.status(200).json({ message: 'LOGGED_OUT' });
	} catch (err) {
		next(err);
	}
});

router.get('/pending-requests', async (req, res, next) => {
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
			obj.cong_role = ['admin', requests[i].data.cong_role];

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
	body('request_id').notEmpty(),
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

			// get congregation request
			const requestInfo = await getCongregationRequestInfo(req.body.request_id);
			if (requestInfo) {
				const { cong_requestor_email, cong_name, cong_number, cong_role } =
					requestInfo;

				// get requestor fullname
				const userInfo = await getUserInfo(cong_requestor_email);

				if (userInfo) {
					const cong_requestor_name = userInfo.about.name;

					// generate congregation id
					const congID = await generateCongregationID();

					// create congregation data
					const data = {
						cong_name: cong_name,
						cong_number: cong_number,
					};

					await db
						.collection('congregation_data')
						.doc(congID.toString())
						.set(data, { merge: true });

					// update user permission
					const userData = {
						congregation: {
							id: congID,
							role: cong_role,
						},
					};
					await db
						.collection('users')
						.doc(cong_requestor_email)
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
						cong_requestor_email,
						cong_requestor_name,
						cong_name,
						cong_number
					);

					res.locals.type = 'info';
					res.locals.message = 'congregation created';
					res.status(200).json({ message: 'OK' });
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'congregation requestor email could no longer be found';
					res.status(404).json({ message: 'EMAIL_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'congregation request id could not be found';
				res.status(404).json({ message: 'REQUEST_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/congregation-request-disapprove',
	body('request_id').notEmpty(),
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

			// get congregation request
			const requestInfo = await getCongregationRequestInfo(req.body.request_id);
			if (requestInfo) {
				const { cong_requestor_email, cong_name, cong_number } = requestInfo;

				// get requestor fullname
				const userInfo = await getUserInfo(cong_requestor_email);

				if (userInfo) {
					const cong_requestor_name = userInfo.username;

					// set congregation request as disapproved
					const requestData = {
						approval: 'disapproved',
					};
					await db
						.collection('congregation_request')
						.doc(req.body.request_id)
						.set(requestData, { merge: true });

					// send email to user
					sendCongregationAccountDisapproved(
						cong_requestor_email,
						cong_requestor_name,
						cong_name,
						cong_number,
						req.body.disapproval_reason
					);

					res.locals.type = 'info';
					res.locals.message = 'congregation account request disapproved';
					res.status(200).json({ message: 'OK' });
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'congregation requestor email could no longer be found';
					res.status(404).json({ message: 'EMAIL_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'congregation request id could not be found';
				res.status(404).json({ message: 'REQUEST_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	}
);

router.get('/users', async (req, res, next) => {
	try {
		const users = await getUsers();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all users';
		res.status(200).json(users);
	} catch (err) {
		next(err);
	}
});

router.post(
	'/delete-user',
	body('user_uid').notEmpty(),
	body('user_type').notEmpty(),
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

			if (req.body.user_type !== 'pocket' && req.body.user_type !== 'vip') {
				res.locals.type = 'warn';
				res.locals.message = 'invalid user type';

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			if (req.body.user_type === 'pocket') {
				await db.collection('users').doc(req.body.user_uid).delete();

				res.locals.type = 'info';
				res.locals.message = 'sucessfully deleted user';
				res.status(200).json({ message: 'OK' });
			} else {
				getAuth()
					.deleteUser(req.body.user_uid)
					.then(async () => {
						await db.collection('users').doc(req.body.user_uid).delete();

						res.locals.type = 'info';
						res.locals.message = 'sucessfully deleted user';
						res.status(200).json({ message: 'OK' });
					})
					.catch((error) => {
						res.locals.type = 'warn';
						res.locals.message = `error deleting user: ${error}`;
						res.status(400).json({ message: error });
					});
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/enable-user',
	body('user_uid').notEmpty(),
	body('user_type').notEmpty(),
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

			if (req.body.user_type !== 'pocket' && req.body.user_type !== 'vip') {
				res.locals.type = 'warn';
				res.locals.message = 'invalid user type';

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			if (req.body.user_type === 'pocket') {
				const userRef = db.collection('users').doc(req.body.user_uid);
				const userSnap = await userRef.get();

				const data = {
					about: { ...userSnap.data().about, pocket_disabled: false },
				};

				await db
					.collection('users')
					.doc(req.body.user_uid)
					.set(data, { merge: true });

				res.locals.type = 'info';
				res.locals.message = 'user enabled successfully';
				res.status(200).json({ message: 'OK' });
			} else {
				getAuth()
					.updateUser(req.body.user_uid, {
						disabled: false,
					})
					.then(() => {
						res.locals.type = 'info';
						res.locals.message = 'user enabled successfully';
						res.status(200).json({ message: 'OK' });
					})
					.catch((error) => {
						res.locals.type = 'warn';
						res.locals.message = `error updating user: ${error}`;
						res.status(400).json({ message: error });
					});
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/disable-user',
	body('user_uid').notEmpty(),
	body('user_type').notEmpty(),
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

			if (req.body.user_type !== 'pocket' && req.body.user_type !== 'vip') {
				res.locals.type = 'warn';
				res.locals.message = 'invalid user type';

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			if (req.body.user_type === 'pocket') {
				const userRef = db.collection('users').doc(req.body.user_uid);
				const userSnap = await userRef.get();

				const data = {
					about: { ...userSnap.data().about, pocket_disabled: true },
				};

				await db
					.collection('users')
					.doc(req.body.user_uid)
					.set(data, { merge: true });

				res.locals.type = 'info';
				res.locals.message = 'user disabled successfully';
				res.status(200).json({ message: 'OK' });
			} else {
				getAuth()
					.updateUser(req.body.user_uid, {
						disabled: true,
					})
					.then(() => {
						res.locals.type = 'info';
						res.locals.message = 'user disabled successfully';
						res.status(200).json({ message: 'OK' });
					})
					.catch((error) => {
						res.locals.type = 'warn';
						res.locals.message = `error updating user: ${error}`;
						res.status(400).json({ message: error });
					});
			}
		} catch (err) {
			next(err);
		}
	}
);

router.post(
	'/user-reset-password',
	body('user_email').isEmail(),
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

			getAuth()
				.generatePasswordResetLink(req.body.user_email)
				.then(async (resetLink) => {
					// send email to user
					const userInfo = await getUserInfo(req.body.user_email);

					sendUserResetPassword(
						req.body.user_email,
						userInfo.about.name,
						resetLink
					);

					res.locals.type = 'info';
					res.locals.message = 'user password reset email queued for sending';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error generating link: ${error}`;
					res.status(400).json({ message: error });
				});
		} catch (err) {
			next(err);
		}
	}
);

router.get('/congregations', async (req, res, next) => {
	try {
		const congsList = await getCongregations();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all congregation';
		res.status(200).json(congsList);
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

router.post(
	'/revoke-user-token',
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

			// get user identifier
			const user_uid = req.body.user_uid;

			// generate new secret and encrypt
			const secret = twofactor.generateSecret({
				name: 'sws2apps',
				account: user_uid,
			});

			const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
			const cryptr = new Cryptr(myKey);
			const encryptedData = cryptr.encrypt(JSON.stringify(secret));

			// Retrieve user from database

			const userRef = db.collection('users').doc(user_uid);
			const userSnap = await userRef.get();

			// remove all sessions and save new secret
			const data = {
				about: {
					...userSnap.data().about,
					mfaEnabled: false,
					secret: encryptedData,
					sessions: [],
				},
			};
			await db.collection('users').doc(user_uid).set(data, { merge: true });

			res.locals.type = 'info';
			res.locals.message = 'admin revoked user token access';
			res.status(200).json({ message: 'OK' });
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

export default router;
