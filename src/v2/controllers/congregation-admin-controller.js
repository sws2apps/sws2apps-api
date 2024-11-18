import { validationResult } from 'express-validator';
import { decryptData } from '../utils/encryption-utils.js';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';
import { allowedRoles } from '../constant/constant.js';

export const getCongregationMembers = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (id) {
		const cong = congregations.findCongregationById(id);

		if (cong) {
			const isValid = cong.isMember(uid);

			if (isValid) {
				// format members before send
				const cong_members = cong.cong_members.map((member) => {
					delete member.secret;
					delete member.emailOTP;

					return member;
				});

				res.locals.type = 'info';
				res.locals.message = 'user fetched congregation members';
				res.status(200).json(cong_members);
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation id params is undefined';
	res.status(400).json({ message: 'CONG_ID_INVALID' });
};

export const findUserByCongregation = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	const search = req.query.search;

	if (!id) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	const cong = congregations.findCongregationById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	const isValid = await cong.isMember(uid);

	if (!isValid) {
		res.locals.type = 'warn';
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		return;
	}

	if (!search || search?.length === 0) {
		res.locals.type = 'warn';
		res.locals.message = 'the search parameter is not correct';
		res.status(400).json({ message: 'SEARCH_INVALID' });
		return;
	}

	const userData = await users.findUserByEmail(search);

	if (!userData) {
		res.locals.type = 'warn';
		res.locals.message = 'user could not be found';
		res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
		return;
	}

	if (userData.cong_id === id) {
		res.locals.type = 'info';
		res.locals.message = 'user is already member of the congregation';
		res.status(200).json({ message: 'ALREADY_MEMBER' });
		return;
	}

	if (userData.cong_id !== '') {
		res.locals.type = 'warn';
		res.locals.message = 'user could not be found';
		res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user details fetched successfully';
	res.status(200).json(userData);
};

export const getCongregationUser = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findUserById(user);

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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const removeCongregationUser = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = cong.isMember(uid);

			if (isValid) {
				const findUser = users.findUserById(user);

				if (findUser.cong_id === id) {
					await cong.removeUser(user);

					res.locals.type = 'info';
					res.locals.message = 'member removed from the congregation';
					res.status(200).json({ message: 'OK' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'member is no longer found in the congregation';
				res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const addCongregationUser = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (id) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
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

				const user = req.body.user_id;
				const findUser = await users.findUserById(user);

				if (findUser.cong_id === '') {
					await cong.addUser(user);

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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const updateCongregationMemberDetails = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const findUser = await users.findUserById(user);

				if (findUser.cong_id === id) {
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

					const { user_local_uid, user_members_delegate, user_role } = req.body;

					// validate provided role
					let isRoleValid = true;
					if (user_role.length > 0) {
						for (const role of user_role) {
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

					await cong.updateUserRole(user, user_role);
					await findUser.updateMembersDelegate(user_members_delegate);
					await findUser.updateLocalUID(user_local_uid);

					res.locals.type = 'info';
					res.locals.message = 'member details in congregation updated';
					res.status(200).json({ message: 'MEMBER_UPDATED' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'member is no longer found in the congregation';
				res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const getCongregationPockerUser = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user && user !== 'undefined') {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = users.findPocketUser(user);

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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const createNewPocketUser = async (req, res) => {
	const { id } = req.params;
	const { uid } = req.headers;

	if (id) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
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

				const { user_local_uid, username } = req.body;

				await cong.createPocketUser(username, user_local_uid);

				res.locals.type = 'info';
				res.locals.message = 'pocket user created successfully';
				res.status(200).json({ message: 'POCKET_CREATED' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const updatePocketDetails = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findUserById(user);

				if (userData) {
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

					const { user_local_uid, user_role, user_members_delegate } = req.body;

					await userData.updatePocketDetails({ user_local_uid, user_role, user_members_delegate });

					res.locals.type = 'info';
					res.locals.message = 'pocket details updated';
					res.status(200).json({ message: 'POCKET_USER_UPDATED' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'pocket user could not be found';
				res.status(404).json({ message: 'POCKET_NOT_FOUND' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const updatePocketUsername = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findPocketUser(user);

				if (userData) {
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

					const { username } = req.body;
					await userData.updateFullname(username);

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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const updateMembersDelegate = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findPocketUser(user);

				if (userData) {
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

					const { members } = req.body;
					await userData.updateMembersDelegate(members);

					res.locals.type = 'info';
					res.locals.message = 'user members deledate updated';
					res.status(200).json({ user_members_delegate: members });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'pocket user could not be found';
				res.status(404).json({ message: 'POCKET_NOT_FOUND' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const generatePocketOTPCode = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findUserById(user);

				if (userData) {
					const code = await userData.generatePocketCode();

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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const deletePocketOTPCode = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

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

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findUserById(user);

				if (userData) {
					await userData.removePocketCode();

					// if no device, delete pocket user
					let devices = userData.pocket_devices || [];
					if (devices.length === 0) {
						await cong.deletePocketUser(userData.id);

						res.locals.type = 'info';
						res.locals.message = 'pocket code removed, and pocket user deleted';
						res.status(200).json({ message: 'POCKET_USER_DELETED' });
					} else {
						res.locals.type = 'info';
						res.locals.message = 'pocket code successfully removed';
						res.status(200).json({ message: 'POCKET_CODE_REMOVED' });
					}

					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'pocket user could not be found';
				res.status(404).json({ message: 'POCKET_NOT_FOUND' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};

export const deletePocketDevice = async (req, res) => {
	const { id, user } = req.params;
	const { uid } = req.headers;

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

	const pocket_visitorid = isNaN(req.body.pocket_visitorid) ? req.body.pocket_visitorid : +req.body.pocket_visitorid;

	if (id && user) {
		const cong = congregations.findCongregationById(id);
		if (cong) {
			const isValid = await cong.isMember(uid);

			if (isValid) {
				const userData = await users.findUserById(user);

				if (userData) {
					// remove device
					let devices = userData.pocket_devices || [];
					let newDevices = devices.filter((device) => device.visitorid !== pocket_visitorid);

					if (newDevices.length > 0) {
						await userData.removePocketDevice(newDevices);

						res.locals.type = 'info';
						res.locals.message = 'pocket device successfully removed';
						res.status(200).json({ devices: newDevices });
					}

					// if no device, delete pocket user
					if (newDevices.length === 0) {
						await cong.deletePocketUser(userData.id);

						res.locals.type = 'info';
						res.locals.message = 'pocket device removed, and pocket user deleted';
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
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	res.locals.type = 'warn';
	res.locals.message = 'the congregation and user ids params are undefined';
	res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
};
