import { check, validationResult } from 'express-validator';
import { users } from '../classes/Users.js';

export const pocketAuthChecker = () => {
	return async (req, res, next) => {
		try {
			await check('visitorid').notEmpty().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const { visitorid } = req.headers;

			const user = await users.findPocketByVisitorId(visitorid);

			// found user or it is a sign up request
			if (user || req.path === '/signup') {
				res.locals.currentUser = user;

				// update last connection for found user
				if (user) {
					await user.updatePocketDevicesInfo(visitorid);
				}

				next();

				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'the visitor id is not associated yet to any congregation';

			res.status(403).json({ message: 'SETUP_FIRST' });
		} catch (err) {
			next(err);
		}
	};
};
