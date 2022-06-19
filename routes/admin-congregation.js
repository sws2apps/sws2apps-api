// dependencies
import express from 'express';
import { body, validationResult } from 'express-validator';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// utils
import {
	findCongregationRequestById,
	getCongregationInfo,
	getCongregations,
	getCongregationsRequests,
} from '../utils/congregation-utils.js';
import { encryptData } from '../utils/encryption-utils.js';
import {
	sendCongregationAccountCreated,
	sendCongregationAccountDisapproved,
} from '../utils/sendEmail.js';
import { getUserInfo } from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const congsList = await getCongregations();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all congregation';
		res.status(200).json(congsList);
	} catch (err) {
		next(err);
	}
});

router.get('/requests', async (req, res, next) => {
	try {
		const finalResult = await getCongregationsRequests();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched pending requests';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
});

router.put('/:id/approve', async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const request = await findCongregationRequestById(id);
			if (request) {
				if (request.approved) {
					res.locals.type = 'warn';
					res.locals.message = 'this congregation request was already approved';
					res.status(405).json({ message: 'REQUEST_APPROVED' });
				} else {
					// create congregation data
					const congData = {
						cong_name: request.cong_name,
						cong_number: request.cong_number,
					};
					const cong = await db.collection('congregations').add(congData);

					// update requestor info
					const userData = {
						congregation: { id: cong.id, role: request.cong_role },
					};
					await db
						.collection('users')
						.doc(request.user_id)
						.set(userData, { merge: true });

					// update request props
					const requestData = {
						approved: true,
						request_open: false,
					};
					await db
						.collection('congregation_request')
						.doc(id)
						.set(requestData, { merge: true });

					// send email to user
					sendCongregationAccountCreated(
						request.email,
						request.username,
						request.cong_name,
						request.cong_number
					);

					res.locals.type = 'info';
					res.locals.message = 'congregation created';
					res.status(200).json({ message: 'OK' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message =
					'no congregation request could not be found with the provided id';
				res.status(404).json({ message: 'REQUEST_NOT_FOUND' });
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

router.put(
	'/:id/disapprove',
	body('reason').notEmpty(),
	async (req, res, next) => {
		try {
			const { id } = req.params;

			if (id) {
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

				const request = await findCongregationRequestById(id);
				if (request) {
					if (!request.approved && !request.request_open) {
						res.locals.type = 'warn';
						res.locals.message =
							'this congregation request was already disapproved';
						res.status(405).json({ message: 'REQUEST_DISAPPROVED' });
					} else {
						// update request props
						const requestData = {
							approved: false,
							request_open: false,
						};
						await db
							.collection('congregation_request')
							.doc(id)
							.set(requestData, { merge: true });

						// send email to user
						const { reason } = req.body;
						sendCongregationAccountDisapproved(
							request.email,
							request.username,
							request.cong_name,
							request.cong_number,
							reason
						);

						res.locals.type = 'info';
						res.locals.message = 'congregation request disapproved';
						res.status(200).json({ message: 'OK' });
					}
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'no congregation request could not be found with the provided id';
					res.status(404).json({ message: 'REQUEST_NOT_FOUND' });
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

router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				if (cong.cong_members.length > 0) {
					res.locals.type = 'warn';
					res.locals.message =
						'congregation could not be deleted since there are still users inside';
					res.status(405).json({ message: 'CONG_ACTIVE' });
				} else {
					// remove from firestore
					await db.collection('congregations').doc(id).delete();

					res.locals.type = 'info';
					res.locals.message = 'congregation deleted';
					res.status(200).json({ message: 'OK' });
				}
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
});

router.patch(
	'/:id/add-user',
	body('user_uid').notEmpty(),
	async (req, res, next) => {
		try {
			const { id } = req.params;

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

					const { user_uid } = req.body;
					const user = await getUserInfo(user_uid);

					if (user) {
						if (user.cong_id === id) {
							res.locals.type = 'warn';
							res.locals.message =
								'action not allowed since the user is already member of congregation';
							res.status(405).json({ message: 'USER_ALREADY_MEMBER' });
						} else {
							const data = {
								congregation: {
									id: id,
									role: [],
								},
							};

							await db
								.collection('users')
								.doc(user.id)
								.set(data, { merge: true });

							const congsList = await getCongregations();

							res.locals.type = 'info';
							res.locals.message = 'member added to congregation';
							res.status(200).json(congsList);
						}
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'user could not be found';
						res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
					}
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

router.patch(
	'/:id/remove-user',
	body('user_uid').notEmpty(),
	async (req, res, next) => {
		try {
			const { id } = req.params;

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

					const { user_uid } = req.body;
					const user = await getUserInfo(user_uid);

					if (user) {
						if (user.cong_id === id) {
							const userRef = db.collection('users').doc(user.id);
							await userRef.update({ congregation: FieldValue.delete() });
							const congsList = await getCongregations();

							res.locals.type = 'info';
							res.locals.message = 'member removed to congregation';
							res.status(200).json(congsList);
						} else {
							res.locals.type = 'warn';
							res.locals.message =
								'action not allowed since the user is no longer member of congregation';
							res.status(405).json({ message: 'USER_NOT_FOUND' });
						}
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'user could not be found';
						res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
					}
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

router.patch(
	'/:id/update-role',
	body('user_uid').notEmpty(),
	body('user_role').isArray(),
	async (req, res, next) => {
		try {
			const { id } = req.params;

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

					const user = await getUserInfo(user_uid);

					if (user) {
						const data = {
							congregation: {
								id: user.cong_id,
								role: user_role,
							},
						};

						await db
							.collection('users')
							.doc(user.id)
							.set(data, { merge: true });

						const congsList = await getCongregations();

						res.locals.type = 'info';
						res.locals.message = 'user role saved successfully';
						res.status(200).json(congsList);
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'user could not be found';
						res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
					}
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
