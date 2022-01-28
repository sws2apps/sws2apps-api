require('dotenv').config();
const { getFirestore } = require('firebase-admin/firestore'); //load firestore SDK
const requestIp = require('request-ip');
const updateTracker = require('../utils/updateTracker');

require('../config/firebase-config'); //load firebase admin SDK
const db = getFirestore(); //get default database

module.exports = () => {
	return async (req, res, next) => {
		if (Boolean(process.env.NODE_LOGGER)) {
			const clientIp = requestIp.getClientIp(req);
			const reqTrackRef = db.collection('request_tracker').doc(clientIp);
			const docSnap = await reqTrackRef.get();

			if (docSnap.exists) {
				const { reqInProgress, retryOn, failedLoginAttempt } = docSnap.data();
				if (reqInProgress) {
					res.locals.type = 'warn';
					res.locals.message =
						'concurrent request from the same IP address blocked';
					res.status(403).send(JSON.stringify({ message: 'WAIT_FOR_REQUEST' }));
				} else if (retryOn !== '') {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						res.locals.type = 'warn';
						res.locals.message =
							'login from this IP address has been blocked temporarily due to many failed attempts';
						res
							.status(403)
							.send(
								JSON.stringify({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' })
							);
					} else {
						await updateTracker(clientIp, {
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
					res
						.status(403)
						.send(JSON.stringify({ message: 'BLOCKED_TEMPORARILY' }));
					res.on('finish', async () => {
						const currentD = new Date();
						const retryDate = currentD.getTime() + 15 * 60000;
						await updateTracker(clientIp, {
							reqInProgress: false,
							retryOn: retryDate,
						});
					});
				} else {
					await updateTracker(clientIp, { reqInProgress: true });
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
		} else {
			next(); // skip request checker middleware during development
		}
	};
};
