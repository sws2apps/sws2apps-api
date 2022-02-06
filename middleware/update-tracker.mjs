// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// utils import
import { logger } from '../utils/logger.mjs';

// get firestore
const db = getFirestore();

export const updateTracker = () => {
	return async (req, res, next) => {
		try {
			res.on('finish', async () => {
				const clientIp = req.clientIp;
				let data = {};
				data.reqInProgress = false;

				if (res.locals.failedLoginAttempt) {
					const reqTrackRef = db.collection('request_tracker').doc(clientIp);
					const docSnap = await reqTrackRef.get();

					let failedLoginAttempt = docSnap.data().failedLoginAttempt;
					failedLoginAttempt = failedLoginAttempt + 1;

					data.failedLoginAttempt = failedLoginAttempt;
				}

				await db
					.collection('request_tracker')
					.doc(clientIp)
					.set(data, { merge: true });

				let log = '';
				log += `method=${req.method} `;
				log += `status=${res.statusCode} `;
				log += `path=${req.originalUrl} `;
				log += `origin=${req.headers.origin || req.hostname}(${clientIp}) `;
				log += `details=${res.locals.message}`;

				logger(res.locals.type, log);
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
