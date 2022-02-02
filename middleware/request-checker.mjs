// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get logger
import { tracker } from '../utils/tracker.mjs';

// get firestore
const db = getFirestore(); //get default database

export const requestChecker = () => {
	return async (req, res, next) => {
		try {
			if (process.env.TEST_MIDDLEWARE_STATUS === 'error') {
				throw new Error('this is a test error message');
			}

			const clientIp = req.clientIp;

			const reqTrackRef = db.collection('request_tracker').doc(clientIp);
			const docSnap = await reqTrackRef.get();

			const isExist =
				process.env.TEST_REQUEST_CHECKER_SNAP_EXIST === 'false'
					? false
					: docSnap.exists;

			if (isExist) {
				let { reqInProgress, retryOn, failedLoginAttempt } = docSnap.data();

				reqInProgress =
					process.env.TEST_REQUEST_CHECKER_REQ_INPROGRESS === 'true'
						? process.env.TEST_REQUEST_CHECKER_REQ_INPROGRESS
						: reqInProgress;

				retryOn =
					process.env.TEST_REQUEST_CHECKER_IP_BLOCKED === 'true'
						? `${new Date().getTime() + 60000}`
						: process.env.TEST_REQUEST_CHECKER_IP_BLOCKED === 'false'
						? `${new Date().getTime() - 60000}`
						: retryOn;

				failedLoginAttempt =
					process.env.TES_REQUEST_CHECKER_FAILED_LOGIN === '3'
						? +process.env.TES_REQUEST_CHECKER_FAILED_LOGIN
						: failedLoginAttempt;

				if (reqInProgress) {
					res.locals.type = 'warn';
					res.locals.message =
						'concurrent request from the same IP address blocked';
					res.status(403).json({ message: 'WAIT_FOR_REQUEST' });
				} else if (retryOn !== '') {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						res.locals.type = 'warn';
						res.locals.message =
							'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
					} else {
						await tracker(clientIp, {
							reqInProgress: true,
							failedLoginAttempt: 0,
							retryOn: '',
						});
						next();
					}
				} else if (failedLoginAttempt === 3) {
					res.locals.type = 'warn';
					res.locals.message =
						'login from this IP address has been blocked temporarily due to many failed attempts';
					res.status(403).json({ message: 'BLOCKED_TEMPORARILY' });

					res.on('finish', async () => {
						const currentD = new Date();
						const retryDate = currentD.getTime() + 15 * 60000;
						await tracker(clientIp, {
							reqInProgress: false,
							retryOn: retryDate,
						});
					});
				} else {
					await tracker(clientIp, { reqInProgress: true });
					next();
				}
			} else {
				const data = {
					reqInProgress: true,
					failedLoginAttempt: 0,
					retryOn: '',
				};
				await db.collection('request_tracker').doc(clientIp).set(data);
				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
