// dependencies
import 'dotenv/config';
import moment from 'moment';
import { getFirestore } from 'firebase-admin/firestore';

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
			if (process.env.NODE_ENV !== 'production') {
				log += `[${moment().format('YYYY-MM-DD HH:mm:ss')}] - `;
			}
			log += `level=${res.locals.type} `;
			log += `method=${req.method} `;
			log += `status=${res.statusCode} `;
			log += `path=${req.originalUrl} `;
			log += `fwd=${req.headers.origin || req.hostname}(${clientIp}) `;
			log += `msg=${res.locals.message}`;

			console.log(log);
		});

		next();
	};
};
