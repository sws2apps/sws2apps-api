// this middleware serve as a bridge to make sure that we can connect to Google Services before we use them

//app dependencies
import isOnline from 'is-online';

// local utils
import { formatLog } from '../utils/format-log.mjs';
import { logger } from '../utils/logger.mjs';

export const internetChecker = () => {
	return async (req, res, next) => {
		try {
			if (process.env.TEST_SERVER_STATUS === 'error') {
				throw new Error('this is a test error message');
			}

			isOnline().then((result) => {
				let online = result;

				if (process.env.TEST_SERVER_STATUS === 'offline') {
					online = false;
				}

				if (online) {
					next();
				} else {
					logger(
						'warn',
						formatLog(
							'the server could not make request to the internet',
							req,
							res
						)
					);
					res.status(500).json({ message: 'INTERNAL_ERROR' });
				}
			});
		} catch (err) {
			next(err);
		}
	};
};
