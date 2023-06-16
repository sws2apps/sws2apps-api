import fetch from 'node-fetch';
import { validationResult } from 'express-validator';
import { decryptData } from '../utils/encryption-utils.js';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';

export const getLastCongregationBackup = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = users.findUserByAuthUid(uid);

		const isPublisher = cong.isPublisher(user.user_local_uid);
		const isMS = cong.isMS(user.user_local_uid);
		const isElder = cong.isElder(user.user_local_uid);

		const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
		const secretaryRole = user.cong_role.includes('secretary');
		const publisherRole = isPublisher || isMS || isElder;

		if (!lmmoRole && !secretaryRole && !publisherRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to get congregation backup info';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const obj = { user_last_backup: user.last_backup ? { date: user.last_backup } : 'NO_BACKUP' };
		if (lmmoRole || secretaryRole) {
			obj.cong_last_backup = cong.last_backup ? cong.last_backup : 'NO_BACKUP';
		}

		res.locals.type = 'info';
		res.locals.message = 'user get the latest backup info for the congregation';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};

export const saveCongregationBackup = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = users.findUserByAuthUid(uid);

		const isPublisher = cong.isPublisher(user.user_local_uid);
		const isMS = cong.isMS(user.user_local_uid);
		const isElder = cong.isElder(user.user_local_uid);

		const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
		const secretaryRole = user.cong_role.includes('secretary');
		const publisherRole = isPublisher || isMS || isElder;

		if (!lmmoRole && !secretaryRole && !publisherRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to send congregation backup';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		if (secretaryRole) {
			const cong_serviceYear = req.body.cong_serviceYear;
			const isServiceYearValid = cong.isServiceYearValid(cong_serviceYear);

			if (!isServiceYearValid) {
				res.locals.type = 'warn';
				res.locals.message = 'backup aborted because of service years discrepancies';
				res.status(400).json({ message: 'BACKUP_DISCREPANCY' });

				return;
			}
		}

		const payload = req.body;

		if (lmmoRole || secretaryRole) {
			await cong.saveBackup({
				cong_persons: payload.cong_persons,
				cong_deleted: payload.cong_deleted,
				cong_schedule: payload.cong_schedule,
				cong_sourceMaterial: payload.cong_sourceMaterial,
				cong_swsPocket: payload.cong_swsPocket,
				cong_settings: payload.cong_settings,
				cong_branchReports: payload.cong_branchReports,
				cong_fieldServiceGroup: payload.cong_fieldServiceGroup,
				cong_fieldServiceReports: payload.cong_fieldServiceReports,
				cong_lateReports: payload.cong_lateReports,
				cong_meetingAttendance: payload.cong_meetingAttendance,
				cong_minutesReports: payload.cong_minutesReports,
				cong_serviceYear: payload.cong_serviceYear,
				uid,
			});
		}

		if (publisherRole) {
			await user.saveBackup({
				user_bibleStudies: payload.user_bibleStudies,
				user_fieldServiceReports: payload.user_fieldServiceReports,
			});
		}

		res.locals.type = 'info';
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
	} catch (err) {
		next(err);
	}
};

export const getCongregationBackup = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		const user = users.findUserByAuthUid(uid);
		const isPublisher = cong.isPublisher(user.user_local_uid);
		const isMS = cong.isMS(user.user_local_uid);
		const isElder = cong.isElder(user.user_local_uid);

		const lmmoRole = user.cong_role.includes('lmmo') || user.cong_role.includes('lmmo-backup');
		const secretaryRole = user.cong_role.includes('secretary');
		const publisherRole = isPublisher || isMS || isElder;

		if (!lmmoRole && !secretaryRole && !publisherRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the congregation backup';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const obj = {};

		if (lmmoRole || secretaryRole) {
			const backupData = cong.retrieveBackup();

			obj.cong_persons = backupData.cong_persons;
			obj.cong_settings = backupData.cong_settings;

			if (lmmoRole) {
				obj.cong_schedule = backupData.cong_schedule;
				obj.cong_sourceMaterial = backupData.cong_sourceMaterial;
				obj.cong_swsPocket = backupData.cong_swsPocket;
			}

			if (secretaryRole) {
				obj.cong_branchReports = backupData.cong_branchReports;
				obj.cong_fieldServiceGroup = backupData.cong_fieldServiceGroup;
				obj.cong_fieldServiceReports = backupData.cong_fieldServiceReports;
				obj.cong_lateReports = backupData.cong_lateReports;
				obj.cong_meetingAttendance = backupData.cong_meetingAttendance;
				obj.cong_minutesReports = backupData.cong_minutesReports;
				obj.cong_serviceYear = backupData.cong_serviceYear;
			}
		}

		if (publisherRole) {
			const backupData = user.retrieveBackup();
			obj.user_bibleStudies = backupData.user_bibleStudies;
			obj.user_fieldServiceReports = backupData.user_fieldServiceReports;
		}

		res.locals.type = 'info';
		res.locals.message = 'user retrieve backup for congregation successfully';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};

export const getCongregationMembers = async (req, res, next) => {
	try {
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
	} catch (err) {
		next(err);
	}
};

export const removeCongregationUser = async (req, res, next) => {
	try {
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
	} catch (err) {
		next(err);
	}
};

export const findUserByCongregation = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		const search = req.query.search;

		if (id) {
			const cong = await congregations.findCongregationById(id);
			if (cong) {
				const isValid = await cong.isMember(uid);

				if (isValid) {
					if (search && search.length > 0) {
						const userData = await users.findUserByEmail(search);

						if (userData && !userData.disabled && userData.mfaEnabled) {
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
	} catch (err) {
		next(err);
	}
};

export const addCongregationUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (id) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const updateCongregationMemberDetails = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
						const allowedRoles = ['admin', 'lmmo', 'lmmo-backup', 'view_meeting_schedule', 'secretary'];
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
	} catch (err) {
		next(err);
	}
};

export const getCongregationUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const getCongregationPockerUser = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user && user !== 'undefined') {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const createNewPocketUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (id) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const updatePocketDetails = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const updatePocketUsername = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const updateMembersDelegate = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const generatePocketOTPCode = async (req, res, next) => {
	try {
		const { id, user } = req.params;
		const { uid } = req.headers;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const deletePocketOTPCode = async (req, res, next) => {
	try {
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
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const deletePocketDevice = async (req, res, next) => {
	try {
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

		const pocket_visitorid = +req.body.pocket_visitorid;

		if (id && user) {
			const cong = await congregations.findCongregationById(id);
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
	} catch (err) {
		next(err);
	}
};

export const sendPocketSchedule = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (id) {
			const cong = await congregations.findCongregationById(id);
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

					const { schedules, cong_settings } = req.body;

					await cong.sendPocketSchedule(schedules, cong_settings);

					res.locals.type = 'info';
					res.locals.message = 'schedule save for sws pocket application';
					res.status(200).json({ message: 'SCHEDULE_SENT' });
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
	} catch (err) {
		next(err);
	}
};

export const getMeetingSchedules = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (id) {
			const cong = await congregations.findCongregationById(id);
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

					const { cong_sourceMaterial, cong_schedule, cong_settings } = congregations.findCongregationById(id);

					res.locals.type = 'info';
					res.locals.message = 'user has fetched the schedule';
					res.status(200).json({
						cong_sourceMaterial,
						cong_schedule,
						cong_settings: {
							class_count: cong_settings[0]?.class_count || 1,
							source_lang: cong_settings[0]?.source_lang || 'e',
							co_name: cong_settings[0]?.co_name || '',
							co_displayName: cong_settings[0]?.co_displayName || '',
							opening_prayer_autoAssign: cong_settings[0]?.opening_prayer_autoAssign || false,
						},
					});
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
	} catch (err) {
		next(err);
	}
};

export const getCountries = async (req, res, next) => {
	try {
		let language = req.headers.language || 'e';

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

		language = language.toUpperCase();

		const langsAllowed = ['E', 'MG', 'T'];
		if (langsAllowed.includes(language) === false) {
			res.locals.type = 'warn';
			res.locals.message = `invalid language`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const url =
			process.env.JW_COUNTRY_API +
			new URLSearchParams({
				languageCode: language,
			});

		const response = await fetch(url);

		if (response.ok) {
			const countriesList = await response.json();
			res.locals.type = 'info';
			res.locals.message = 'user fetched all countries';
			res.status(200).json(countriesList);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting list of all countries';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
		}
	} catch (err) {
		next(err);
	}
};

export const getCongregations = async (req, res, next) => {
	try {
		let { country, name } = req.headers;
		let language = req.headers.language || 'e';

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

		language = language.toUpperCase();
		country = country.toUpperCase();

		const langsAllowed = ['E', 'MG', 'T'];
		if (langsAllowed.includes(language) === false) {
			res.locals.type = 'warn';
			res.locals.message = `invalid language`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const url =
			process.env.JW_CONGREGATION_API +
			`/${country}?` +
			new URLSearchParams({
				languageCode: language,
				name: name,
			});

		const response = await fetch(url);

		if (response.ok) {
			const congsList = await response.json();
			res.locals.type = 'info';
			res.locals.message = 'user fetched congregations';
			res.status(200).json(congsList);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting congregations list';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
		}
	} catch (err) {
		next(err);
	}
};

export const createCongregation = async (req, res, next) => {
	try {
		const { country_code, cong_name, cong_number, app_requestor, fullname } = req.body;
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

		const validRole = ['lmmo', 'secretary'];

		if (!validRole.includes(app_requestor)) {
			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${app_requestor}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		// find congregation
		const cong = congregations.findByNumber(`${country_code}${cong_number}`);
		if (cong) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation requested already exists';
			res.status(404).json({ message: 'CONG_EXISTS' });

			return;
		}

		// create congregation
		const newCong = await congregations.create({ country_code, cong_name, cong_number });

		// add user to congregation
		const tmpUser = users.findUserByAuthUid(uid);
		const user = await newCong.addUser(tmpUser.id, ['admin', app_requestor], fullname);

		res.locals.type = 'info';
		res.locals.message = 'congregation created successfully';
		res.status(200).json(user);
	} catch (err) {
		next(err);
	}
};

export const updateCongregationInfo = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;
		const { country_code, cong_name, cong_number } = req.body;

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

		if (id) {
			const cong = congregations.findCongregationById(id);
			if (cong) {
				const isValid = cong.isMember(uid);

				if (isValid) {
					const data = { country_code, cong_name, cong_number };
					await cong.updateInfo(data);

					for await (const user of cong.cong_members) {
						const tmpUser = users.findUserById(user.id);
						await tmpUser.loadDetails();
					}

					cong.reloadMembers();
					const user = users.findUserByAuthUid(uid);

					res.locals.type = 'info';
					res.locals.message = 'congregation information updated';
					res.status(200).json(user);
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
	} catch (err) {
		next(err);
	}
};

export const postUserFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		const user = users.findUserByAuthUid(uid);

		const isPublisher = cong.isPublisher(user.user_local_uid);
		const isMS = cong.isMS(user.user_local_uid);
		const isElder = cong.isElder(user.user_local_uid);

		const publisherRole = isPublisher || isMS || isElder;

		if (!publisherRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to post field service reports';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const report = req.body;
		await user.updatePendingFieldServiceReports(report);

		const data = { user_local_uid: user.user_local_uid, ...report };
		cong.updatePendingFieldServiceReports(data);

		res.locals.type = 'info';
		res.locals.message = 'user posted field service reports';
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const unpostUserFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		const user = users.findUserByAuthUid(uid);

		const isPublisher = cong.isPublisher(user.user_local_uid);
		const isMS = cong.isMS(user.user_local_uid);
		const isElder = cong.isElder(user.user_local_uid);

		const publisherRole = isPublisher || isMS || isElder;

		if (!publisherRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to post field service reports';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const month = req.body.month;
		await user.unpostFieldServiceReports(month);
		cong.removePendingFieldServiceReports(user.user_local_uid, month);

		res.locals.type = 'info';
		res.locals.message = 'user unposted field service reports';
		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const getPendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregation pending field service reports';
		res.status(200).json(cong.cong_pending_fieldServiceReports);
	} catch (err) {
		next(err);
	}
};

export const approvePendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		const { user_local_uid, month } = req.body;

		cong.removePendingFieldServiceReports(user_local_uid, month);

		const user = users.findUserByLocalUid(user_local_uid);
		await user.approveFieldServiceReports(month);

		res.locals.type = 'info';
		res.locals.message = 'user approved pending field service reports';
		res.status(200).json({ message: 'S4_REPORT_APPROVED' });
	} catch (err) {
		next(err);
	}
};

export const disapprovePendingFieldServiceReports = async (req, res, next) => {
	try {
		const { id } = req.params;
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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

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

		const { user_local_uid, month } = req.body;

		cong.removePendingFieldServiceReports(user_local_uid, month);

		const user = users.findUserByLocalUid(user_local_uid);
		await user.disapproveFieldServiceReports(month);

		res.locals.type = 'info';
		res.locals.message = 'user disapproved pending field service reports';
		res.status(200).json({ message: 'S4_REPORT_DISAPPROVED' });
	} catch (err) {
		next(err);
	}
};
