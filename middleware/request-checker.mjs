// dependencies
import 'dotenv/config';
import { getFirestore } from 'firebase-admin/firestore';

// get logger
import { tracker } from '../utils/tracker.mjs';

// get firestore
const db = getFirestore(); //get default database

export const requestChecker = () => {
	return async (req, res, next) => {
		const clientIp = req.clientIp;

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
						.send(JSON.stringify({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' }));
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
				res
					.status(403)
					.send(JSON.stringify({ message: 'BLOCKED_TEMPORARILY' }));

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
	};
};
