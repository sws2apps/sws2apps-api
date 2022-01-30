// this middleware serve as a bridge to make sure that we can connect to Google Services before we use them

//app dependencies
import isOnline from 'is-online';

// local utils
import { logger } from '../utils/logger.mjs';

export const internetChecker = () => {
	return async (req, res, next) => {
		isOnline()
			.then((result) => {
				if (result) {
					next();
				} else {
					logger(
						'warn',
						'the server could not make request to the internet',
						req,
						res
					);
					res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
				}
			})
			.catch((err) => {
				logger('warn', `an error occured: ${err.message}`, req, res);
				res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
			});
	};
};
