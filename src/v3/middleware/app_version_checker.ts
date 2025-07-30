import { NextFunction, Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { formatError } from '../utils/format_log.js';
import { isValidClientVersion } from '../utils/app.js';

export const appVersionChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await check('appclient').isString().notEmpty().run(req);
			await check('appversion').isString().notEmpty().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				const msg = formatError(errors);

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const appClient = req.headers.appclient as string | undefined;
			const appVersion = req.headers.appversion as string;

			if (appClient !== 'organized') {
				next();
				return;
			}

			const validVersion = isValidClientVersion(appVersion);

			if (!validVersion) {
				res.locals.type = 'warn';
				res.locals.message = `client version outdated`;
				res.status(400).json({ message: 'CLIENT_VERSION_OUTDATED' });
				return;
			}

			next();
		} catch (err) {
			next(err);
		}
	};
};
