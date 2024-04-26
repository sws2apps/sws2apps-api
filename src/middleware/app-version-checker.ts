import { NextFunction, Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { API_VAR } from '../index.js';

export const appVersionChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await check('appclient').isString().notEmpty().run(req);
			await check('appversion').isString().notEmpty().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.msg}`;
				});

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

			const appMinimum = API_VAR.MINIMUM_APP_VERSION;

			const majorOK = +appVersion.split('.')[0] > +appMinimum.split('.')[0];
			const minorOK = +appVersion.split('.')[1] > +appMinimum.split('.')[1];
			const patchOK = +appVersion.split('.')[2] > +appMinimum.split('.')[2];

			if (appMinimum === appVersion || majorOK || (!majorOK && minorOK) || (!minorOK && patchOK)) {
				next();
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = `client version outdated`;
			res.status(400).json({ message: 'CLIENT_VERSION_OUTDATED' });
		} catch (err) {
			next(err);
		}
	};
};
