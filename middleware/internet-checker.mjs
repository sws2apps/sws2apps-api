// this middleware serve as a bridge to make sure that we can connect to Google Services before we use them

//app dependencies
import isOnline from 'is-online';

// local utils
import { formatLog } from '../utils/format-log.mjs';
import { logger } from '../utils/logger.mjs';

export const internetChecker = () => {
	return async (req, res, next) => {
		try {
			isOnline().then((result) => {
				if (result) {
					next();
				} else {
					res.status(500).json({ message: 'INTERNAL_ERROR' });
					logger(
						'warn',
						formatLog(
							'the server could not make request to the internet',
							req,
							res
						)
					);
				}
			});
		} catch (err) {
			next(err);
		}
	};
};
