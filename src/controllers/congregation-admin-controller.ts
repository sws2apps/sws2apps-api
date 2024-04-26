import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CongregationsList } from '../classes/Congregations.js';

export const setCongregationEncryptionKey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;
		const uid = req.headers.uid as string;

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

		const isValid = await cong.hasMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const key = req.body.encryption_code;
		await cong.saveEncryptionKey(key);

		res.locals.type = 'warn';
		res.locals.message = 'congregation admin set encryption key';
		res.status(200).json({ message: 'ENCRYPTION_KEY_SAVED' });
		return;
	} catch (err) {
		next(err);
	}
};
