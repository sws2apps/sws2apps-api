// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

export const requestChecker = () => {
	return async (req, res, next) => {
		try {
			const clientIp = req.clientIp;
			const reqTrackRef = requestTracker.find(
				(client) => client.ip === clientIp
			);

			if (reqTrackRef) {
				const { reqInProgress, retryOn, failedLoginAttempt } = reqTrackRef;

				const ipIndex = requestTracker.findIndex(
					(client) => client.ip === clientIp
				);

				if (reqInProgress) {
					res.locals.type = 'warn';
					res.locals.message =
						'concurrent request from the same IP address blocked';
					res.status(403).json({ message: 'WAIT_FOR_REQUEST' });
				} else {
					if (retryOn !== '') {
						const currentDate = new Date().getTime();
						if (currentDate < retryOn) {
							res.locals.type = 'warn';
							res.locals.message =
								'login from this IP address has been blocked temporarily due to many failed attempts';
							res
								.status(403)
								.json({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
						} else {
							requestTracker.splice(ipIndex, 1);
							next();
						}
					} else {
						if (failedLoginAttempt === 3) {
							res.locals.type = 'warn';
							res.locals.message =
								'login from this IP address has been blocked temporarily due to many failed attempts';
							res.status(403).json({ message: 'BLOCKED_TEMPORARILY' });

							res.on('finish', async () => {
								const currentD = new Date();
								const retryDate = currentD.getTime() + 15 * 60000;

								const ipIndex = requestTracker.findIndex(
									(client) => client.ip === clientIp
								);

								requestTracker.splice(ipIndex, 1);

								let obj = {};
								obj.ip = clientIp;
								obj.reqInProgress = false;
								obj.failedLoginAttempt = 3;
								obj.retryOn = retryDate;

								requestTracker.push(obj);
							});
						} else {
							requestTracker.splice(ipIndex, 1);

							let obj = {};
							obj.ip = clientIp;
							obj.reqInProgress = true;
							obj.failedLoginAttempt = failedLoginAttempt;
							obj.retryOn = '';

							requestTracker.push(obj);
							next();
						}
					}
				}
			} else {
				let obj = {};
				obj.ip = clientIp;
				obj.reqInProgress = true;
				obj.failedLoginAttempt = 0;
				obj.retryOn = '';
				requestTracker.push(obj);

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
