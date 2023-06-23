import { validationResult } from 'express-validator';
import { congregations } from '../classes/Congregations.js';
import { users } from '../classes/Users.js';
import { allowedRoles } from '../constant/constant.js';

export const getAllCongregations = async (req, res, next) => {
	try {
		const congsList = congregations.list;

		const result = congsList.map((cong) => {
			return {
				id: cong.id,
				country_code: cong.country_code,
				cong_name: cong.cong_name,
				cong_number: cong.cong_number,
				cong_members: cong.cong_members,
			};
		});

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all congregation';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const deleteCongregation = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = congregations.findCongregationById(id);
			if (cong) {
				if (cong.cong_members.length > 0) {
					res.locals.type = 'warn';
					res.locals.message = 'congregation could not be deleted since there are still users inside';
					res.status(405).json({ message: 'CONG_ACTIVE' });
				} else {
					// remove from firestore
					await congregations.delete(id);

					res.locals.type = 'info';
					res.locals.message = 'congregation deleted';
					res.status(200).json({ message: 'OK' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'no congregation could not be found with the provided id';
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

export const addCongregationUserWithoutId = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { cong_country, cong_name, cong_number, user_uid, user_role } = req.body;
		const user = users.findUserByEmail(user_uid);

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'user could not be found';
			res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			return;
		}

		let cong = congregations.findByNumber(`${cong_country}${cong_number}`);

		if (!cong) {
			const congData = { country_code: cong_country, cong_name, cong_number };
			cong = await congregations.create(congData);
		}

		if (user.cong_id === cong.id) {
			res.locals.type = 'warn';
			res.locals.message = 'action not allowed since the user is already member of congregation';
			res.status(405).json({ message: 'USER_ALREADY_MEMBER' });
			return;
		}

		await cong.addUser(user.id, user_role);

		res.locals.type = 'info';
		res.locals.message = 'member added to congregation';
		res.status(200).json({ message: 'MEMBER_ADDED' });
	} catch (err) {
		next(err);
	}
};

export const addCongregationUser = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = congregations.findCongregationById(id);

			if (cong) {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					let msg = '';
					errors.array().forEach((error) => {
						msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
					});

					res.locals.type = 'warn';
					res.locals.message = `invalid input: ${msg}`;

					res.status(400).json({
						message: 'Bad request: provided inputs are invalid.',
					});

					return;
				}

				const { user_uid, user_role } = req.body;
				const user = users.findUserByEmail(user_uid);

				if (user) {
					if (user.cong_id === id) {
						res.locals.type = 'warn';
						res.locals.message = 'action not allowed since the user is already member of congregation';
						res.status(405).json({ message: 'USER_ALREADY_MEMBER' });
					} else {
						await cong.addUser(user.id, user_role);

						res.locals.type = 'info';
						res.locals.message = 'member added to congregation';
						res.status(200).json({ message: 'MEMBER_ADDED' });
					}
				} else {
					res.locals.type = 'warn';
					res.locals.message = 'user could not be found';
					res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'no congregation could not be found with the provided id';
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

export const removeCongregationUser = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = congregations.findCongregationById(id);

			if (cong) {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					let msg = '';
					errors.array().forEach((error) => {
						msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
					});

					res.locals.type = 'warn';
					res.locals.message = `invalid input: ${msg}`;

					res.status(400).json({
						message: 'Bad request: provided inputs are invalid.',
					});

					return;
				}

				const { user_id } = req.body;
				const user = users.findUserById(user_id);

				if (user) {
					if (user.cong_id === id) {
						if (user.global_role === 'pocket') {
							await cong.deletePocketUser(user.id);
						} else {
							await cong.removeUser(user.id);
						}

						const congsList = congregations.list;

						res.locals.type = 'info';
						res.locals.message = 'member removed to congregation';
						res.status(200).json(congsList);
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'action not allowed since the user is no longer member of congregation';
						res.status(405).json({ message: 'USER_NOT_FOUND' });
					}
				} else {
					res.locals.type = 'warn';
					res.locals.message = 'user could not be found';
					res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'no congregation could not be found with the provided id';
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

export const updateCongregationUserRole = async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = congregations.findCongregationById(id);
			if (cong) {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					let msg = '';
					errors.array().forEach((error) => {
						msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
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

				const user = users.findUserByEmail(user_uid);

				if (user) {
					cong.updateUserRole(user.id, user_role);

					res.locals.type = 'info';
					res.locals.message = 'user role saved successfully';
					res.status(200).json({ message: 'ROLE_UPDATED' });
				} else {
					res.locals.type = 'warn';
					res.locals.message = 'user could not be found';
					res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'no congregation could not be found with the provided id';
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
