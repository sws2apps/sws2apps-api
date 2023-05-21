import fetch from 'node-fetch';
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

			const resGist = await fetch('https://api.github.com/gists/fb4930b45152ebe196ef64718a80820f');
			const data = await resGist.json();
			const apiReq = JSON.parse(data.files['sws2apps_api.json'].content);

			const cpeMinimum = apiReq.find((record) => record.client === 'cpe').version;

			if (appVersion >= cpeMinimum) {
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
