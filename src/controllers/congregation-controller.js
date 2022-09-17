// dependencies
import { validationResult } from 'express-validator';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import randomstring from 'randomstring';

// utils
import {
	checkCongregationMember,
	findCongregationRequestByEmail,
	getCongregationInfo,
} from '../utils/congregation-utils.js';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { sendCongregationRequest } from '../utils/sendEmail.js';
import {
	findUserById,
	getPocketUser,
	getUserInfo,
} from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

export const requestCongregation = async (req, res, next) => {
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
};

export const getLastCongregationBackup = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email } = req.headers;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
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
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};

export const saveCongregationBackup = async (req, res, next) => {
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

				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const {
						cong_persons,
						cong_schedule,
						cong_sourceMaterial,
						cong_swsPocket,
					} = req.body;

					// encrypt cong_persons data
					const encryptedPersons = encryptData(cong_persons);

					const userInfo = await getUserInfo(email);

					const data = {
						cong_persons: encryptedPersons,
						cong_schedule_draft: cong_schedule,
						cong_sourceMaterial_draft: cong_sourceMaterial,
						cong_swsPocket: cong_swsPocket,
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

					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};

export const getCongregationBackup = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email } = req.headers;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const {
						cong_persons,
						cong_schedule_draft,
						cong_sourceMaterial_draft,
						cong_swsPocket,
					} = cong;

					// decrypt cong_persons data
					const decryptedPersons = JSON.parse(decryptData(cong_persons));

					const obj = {
						cong_persons: decryptedPersons,
						cong_schedule: cong_schedule_draft,
						cong_sourceMaterial: cong_sourceMaterial_draft,
						cong_swsPocket: cong_swsPocket,
					};

					res.locals.type = 'info';
					res.locals.message =
						'user retrieve backup for congregation successfully';
					res.status(200).json(obj);
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};

export const getCongregationMembers = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email } = req.headers;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					res.locals.type = 'info';
					res.locals.message = 'user fetched congregation members';
					res.status(200).json(cong.cong_members);
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};

export const removeCongregationUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const findUser = await findUserById(user);

					if (findUser.cong_id === id) {
						await db
							.collection('users')
							.doc(user)
							.update({ congregation: FieldValue.delete() });

						const cong = await getCongregationInfo(id);

						res.locals.type = 'info';
						res.locals.message = 'member removed from the congregation';
						res.status(200).json(cong.cong_members);
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'member is no longer found in the congregation';
					res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const findUserByCongregation = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email } = req.headers;

		const search = req.query.search;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					if (search && search.length > 0) {
						const userData = await getUserInfo(search);

						if (userData && !userData.disabled && userData.mfaEnabled) {
							if (userData.cong_id === id) {
								res.locals.type = 'info';
								res.locals.message =
									'user is already member of the congregation';
								res.status(200).json({ message: 'ALREADY_MEMBER' });
								return;
							}

							res.locals.type = 'info';
							res.locals.message = 'user details fetched successfully';
							res.status(200).json(userData);
							return;
						}

						res.locals.type = 'warn';
						res.locals.message = 'user could not be found';
						res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'the search parameter is not correct';
					res.status(400).json({ message: 'SEARCH_INVALID' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};

export const addCongregationUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const findUser = await findUserById(user);

					if (findUser.cong_id === '') {
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

						const { user_role } = req.body;

						// validate provided role
						let isRoleValid = true;
						const allowedRoles = ['admin', 'lmmo', 'lmmo-backup'];
						if (user_role > 0) {
							for (let i = 0; i < user_role.length; i++) {
								const role = user_role[i];
								if (!allowedRoles.includes(role)) {
									isRoleValid = false;
									break;
								}
							}
						}

						if (!isRoleValid) {
							res.locals.type = 'warn';
							res.locals.message = `invalid role provided`;

							res.status(400).json({
								message: 'Bad request: provided inputs are invalid.',
							});

							return;
						}

						await db
							.collection('users')
							.doc(user)
							.update({
								congregation: {
									id: id,
									role: user_role,
								},
							});

						res.locals.type = 'info';
						res.locals.message = 'member added to the congregation';
						res.status(200).json({ message: 'MEMBER_ADDED' });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'member already has a congregation';
					res.status(400).json({ message: 'ALREADY_MEMBER' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const updateCongregationRole = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const findUser = await findUserById(user);

					if (findUser.cong_id === id) {
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

						const { user_role } = req.body;

						// validate provided role
						let isRoleValid = true;
						const allowedRoles = ['admin', 'lmmo', 'lmmo-backup'];
						if (user_role > 0) {
							for (let i = 0; i < user_role.length; i++) {
								const role = user_role[i];
								if (!allowedRoles.includes(role)) {
									isRoleValid = false;
									break;
								}
							}
						}

						if (!isRoleValid) {
							res.locals.type = 'warn';
							res.locals.message = `invalid role provided`;

							res.status(400).json({
								message: 'Bad request: provided inputs are invalid.',
							});

							return;
						}

						await db.collection('users').doc(user).update({
							'congregation.role': user_role,
						});

						res.locals.type = 'info';
						res.locals.message = 'member role in congregation updated';
						res.status(200).json({ message: 'ROLE_UPDATED' });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'member is no longer found in the congregation';
					res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const getCongregationUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await findUserById(user);

					if (userData) {
						res.locals.type = 'info';
						res.locals.message = 'user details fetched successfully';
						res.status(200).json(userData);
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'user could not be found';
					res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const getCongregationPockerUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await getPocketUser(user);

					if (userData) {
						const otpCode = userData.pocket_oCode;
						let pocket_oCode = '';

						if (otpCode && otpCode !== '') {
							pocket_oCode = decryptData(userData.pocket_oCode);
						}

						res.locals.type = 'info';
						res.locals.message = 'pocket user details fetched successfully';
						res.status(200).json({ ...userData, pocket_oCode });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'pocket user could not be found';
					res.status(404).json({ message: 'POCKET_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const createNewPocketUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
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

					const code = randomstring.generate(10).toUpperCase();
					const secureCode = encryptData(code);

					const { username } = req.body;

					await db.collection('users').add({
						about: {
							name: username,
							role: 'pocket',
						},
						congregation: {
							id: id,
							local_id: user,
							devices: [],
							oCode: secureCode,
							pocket_role: ['view_meeting_schedule'],
							pocket_members: [],
						},
					});

					res.locals.type = 'info';
					res.locals.message = 'pocket user created successfully';
					res.status(200).json({ username, code });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const updatePocketUsername = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await getPocketUser(user);

					if (userData) {
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

						const { username } = req.body;

						await db.collection('users').doc(userData.id).update({
							'about.name': username,
						});

						res.locals.type = 'info';
						res.locals.message = 'pocket username updated';
						res.status(200).json({ username });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'pocket user could not be found';
					res.status(404).json({ message: 'POCKET_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const updatePocketMembers = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await getPocketUser(user);

					if (userData) {
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

						const { members } = req.body;

						await db.collection('users').doc(userData.id).update({
							'congregation.pocket_members': members,
						});

						res.locals.type = 'info';
						res.locals.message = 'pocket members updated';
						res.status(200).json({ pocket_members: members });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'pocket user could not be found';
					res.status(404).json({ message: 'POCKET_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const generatePocketOTPCode = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await getPocketUser(user);

					if (userData) {
						const code = randomstring.generate(10).toUpperCase();
						const secureCode = encryptData(code);

						await db.collection('users').doc(userData.id).update({
							'congregation.oCode': secureCode,
						});

						res.locals.type = 'info';
						res.locals.message = 'pocket otp code generated';
						res.status(200).json({ code });
						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'pocket user could not be found';
					res.status(404).json({ message: 'POCKET_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const deletePocketDevice = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { email } = req.headers;

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

		const { pocket_visitor_id } = req.body;

		if (id && user) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
					const userData = await getPocketUser(user);

					if (userData) {
						// remove device
						let devices = userData.pocket_devices || [];
						let newDevices = devices.filter(
							(device) => device.visitor_id !== pocket_visitor_id
						);

						if (newDevices.length > 0) {
							await db.collection('users').doc(userData.id).update({
								'congregation.devices': newDevices,
							});

							res.locals.type = 'info';
							res.locals.message = 'pocket device successfully removed';
							res.status(200).json({ devices: newDevices });
						}

						// if no device, delete pocket user
						if (newDevices.length === 0) {
							await db.collection('users').doc(userData.id).delete();

							res.locals.type = 'info';
							res.locals.message =
								'pocket device removed, and pocket user deleted';
							res.status(200).json({ message: 'POCKET_USER_DELETED' });
						}

						return;
					}

					res.locals.type = 'warn';
					res.locals.message = 'pocket user could not be found';
					res.status(404).json({ message: 'POCKET_NOT_FOUND' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation and user ids params are undefined';
		res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const sendPocketSchedule = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { email } = req.headers;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				const isValid = await checkCongregationMember(email, id);

				if (isValid) {
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

					// update pocket schedule and source
					const currentSchedule = cong.cong_schedule || {};
					const studentsSchedule = currentSchedule.students || [];
					const currentSource = cong.cong_sourceMaterial || {};
					const studentsSource = currentSource.students || [];

					// remove expired schedule and source (> 3 months)
					const currentDate = new Date().getTime();
					const validSchedule = studentsSchedule.filter(
						(schedule) => schedule.expiredDate > currentDate
					);
					const validSource = studentsSource.filter(
						(source) => source.expiredDate > currentDate
					);

					// assign expiration date
					const { cong_sourceMaterial, cong_schedule } = req.body;
					const { month, year } = cong_schedule;

					if (isNaN(month) || isNaN(year)) {
						res.locals.type = 'warn';
						res.locals.message =
							'schedule month and year were invalid: not a number';
						res.status(400).json({ message: 'BAD_REQUEST' });
						return;
					}

					const lastDate = new Date(year, month + 1, 0);
					let expiredDate = new Date();
					expiredDate.setDate(lastDate.getDate() + 90);
					const expiredTime = expiredDate.getTime();

					const objSchedule = {
						...cong_schedule,
						expiredDate: expiredTime,
						modifiedDate: new Date().getTime(),
					};
					const objSource = {
						...cong_sourceMaterial,
						expiredDate: expiredTime,
						modifiedDate: new Date().getTime(),
					};

					let newStudentsSchedule = validSchedule.filter(
						(schedule) => schedule.id !== objSchedule.id
					);
					newStudentsSchedule.push(objSchedule);

					let newStudentsSource = validSource.filter(
						(source) => source.id !== objSource.id
					);
					newStudentsSource.push(objSource);

					const newSchedule = {
						...currentSchedule,
						students: newStudentsSchedule,
					};
					const newSource = { ...currentSource, students: newStudentsSource };

					await db.collection('congregations').doc(id).update({
						cong_schedule: newSchedule,
						cong_sourceMaterial: newSource,
					});

					res.locals.type = 'info';
					res.locals.message = 'schedule save for sws pocket application';
					res.status(200).json({ message: 'SCHEDULE_SENT' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message =
					'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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
};
