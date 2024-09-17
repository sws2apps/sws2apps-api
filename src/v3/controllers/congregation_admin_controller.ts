import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CongregationsList } from '../classes/Congregations.js';
import { formatError } from '../utils/format_log.js';
import { UsersList } from '../classes/Users.js';

export const setCongregationMasterKey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const key: string = req.body.cong_master_key;
		await cong.saveMasterKey(key);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin set master key';
		res.status(200).json({ message: 'MASTER_KEY_SAVED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const setCongregationAccessCode = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const accesCode: string = req.body.cong_access_code;
		await cong.saveAccessCode(accesCode);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin set password';
		res.status(200).json({ message: 'PASSWORD_SAVED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const congregationMasterKeyGet = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const master_key = cong.cong_master_key;

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin get master key';
		res.status(200).json({ message: master_key });
		return;
	} catch (err) {
		next(err);
	}
};

export const congregationAccessCodeGet = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const access_code = cong.cong_access_code;

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin get access code';
		res.status(200).json({ message: access_code });
		return;
	} catch (err) {
		next(err);
	}
};

export const pocketUserAdd = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const { user_firstname, user_lastname, cong_role, cong_person_uid, user_secret_code } = req.body;

		await UsersList.createPocket({
			cong_id: id,
			cong_person_uid,
			cong_role,
			user_firstname,
			user_lastname,
			user_secret_code,
		});

		cong.reloadMembers();

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin added pocket user';
		res.status(200).json({ message: 'POCKET_CREATED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const congregationGetUsers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const cong_members = cong.getMembers(req.signedCookies.visitorid);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin fetched all users';
		res.status(200).json(cong_members);
		return;
	} catch (err) {
		next(err);
	}
};

export const userDetailsUpdate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id, user } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation user params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const foundUser = UsersList.findById(user);

		if (!foundUser) {
			res.locals.type = 'warn';
			res.locals.message = 'no user could found with the provided id';
			res.status(404).json({ message: 'USER_NOT_FOUND' });

			return;
		}

		const { user_secret_code, cong_role, cong_person_uid, cong_person_delegates } = req.body;

		await foundUser.updateCongregationDetails(cong_role, cong_person_uid, cong_person_delegates, user_secret_code);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin fetched all users';
		res.status(200).json({ message: 'USER_UPDATED_SUCCESSFULLY' });
		return;
	} catch (err) {
		next(err);
	}
};

export const userSessionDelete = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id, user } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation user params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const foundUser = UsersList.findById(user);

		if (!foundUser) {
			res.locals.type = 'warn';
			res.locals.message = 'no user could found with the provided id';
			res.status(404).json({ message: 'USER_NOT_FOUND' });

			return;
		}

		const identifier = req.body.identifier as string;
		await foundUser.revokeSession(identifier);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin terminated user session';
		res.status(200).json({ message: 'USER_SESSION_TERMINATED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const pocketCodeDelete = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id, user } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation user params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const foundUser = UsersList.findById(user);

		if (!foundUser) {
			res.locals.type = 'warn';
			res.locals.message = 'no user could found with the provided id';
			res.status(404).json({ message: 'USER_NOT_FOUND' });

			return;
		}

		await foundUser.deletePocketCode();

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin deleted user invitation code';
		res.status(200).json({ message: 'POCKET_CODE_DELETED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const globalSearchUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const email = req.query.email as string;
		const foundUser = UsersList.findByEmail(email);

		if (!foundUser || (foundUser?.cong_id && foundUser?.cong_id.length > 0)) {
			res.locals.type = 'warn';
			res.locals.message = 'user not found with the provided email';
			res.status(404).json({ message: 'USER_NOT_FOUND' });

			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin got global user';
		res.status(200).json(foundUser);
		return;
	} catch (err) {
		next(err);
	}
};

export const congregationUserAdd = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const { user_firstname, user_lastname, cong_role, cong_person_uid, user_id } = req.body;

		const user = UsersList.findById(user_id)!;

		await user.assignCongregation({
			congId: id,
			role: cong_role,
			firstname: user_firstname,
			lastname: user_lastname,
			person_uid: cong_person_uid,
		});

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin added pocket user';
		res.status(200).json({ message: 'POCKET_CREATED' });
		return;
	} catch (err) {
		next(err);
	}
};

export const congregationDeleteUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id, user } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });

			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });

			return;
		}

		const isValid = await cong.hasMember(res.locals.currentUser.auth_uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation user params is undefined';
			res.status(400).json({ message: 'CONG_USER_ID_INVALID' });

			return;
		}

		const foundUser = UsersList.findById(user);

		if (!foundUser) {
			res.locals.type = 'warn';
			res.locals.message = 'no user could found with the provided id';
			res.status(404).json({ message: 'USER_NOT_FOUND' });

			return;
		}

		await UsersList.delete(user);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin removed user from congregation';
		res.status(200).json({ message: 'USER_REMOVED' });
		return;
	} catch (err) {
		next(err);
	}
};