import { check, validationResult } from 'express-validator';

export const appVersionChecker = () => {
	return async (req, res, next) => {
		try {
			await check('appclient').isString().notEmpty().run(req);
			await check('appversion').isString().notEmpty().run(req);

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

			const appClient = req.headers.appclient;
			const appVersion = req.headers.appversion;

			if (appClient !== 'cpe') {
				next();
				return;
			}

			const cpeMinimum = global.minimumVersionCPE;

			const majorOK = +appVersion.split('.')[0] > +cpeMinimum.split('.')[0];
			const minorOK = +appVersion.split('.')[1] > +cpeMinimum.split('.')[1];
			const patchOK = +appVersion.split('.')[2] > +cpeMinimum.split('.')[2];

			if (cpeMinimum === appVersion || majorOK || (!majorOK && minorOK) || (!minorOK && patchOK)) {
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
