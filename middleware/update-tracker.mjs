// dependencies
import 'dotenv/config';
import { getFirestore } from 'firebase-admin/firestore';

// utils import
import { logger } from '../utils/logger.mjs';

// get firestore
const db = getFirestore();

export const updateTracker = () => {
	return async (req, res, next) => {
		const clientIp = req.clientIp;

		res.on('finish', async () => {
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

			logger.log(res.locals.type, log);
		});

		next();
	};
};
