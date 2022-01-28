require('dotenv').config();
const dateformat = require('dateformat');
const requestIp = require('request-ip');
const { getFirestore } = require('firebase-admin/firestore'); //load firestore SDK

require('../config/firebase-config'); //load firebase admin SDK
const db = getFirestore(); //get default database

module.exports = () => {
	return async (req, res, next) => {
		const clientIp = requestIp.getClientIp(req);

		res.on('finish', async () => {
			if (Boolean(process.env.NODE_LOGGER)) {
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
			}

			let log = `[${dateformat(Date.now(), 'yyyy-mm-dd HH:MM:ss')}] - `;
			log += `${res.locals.type} - `;
			log += `from ${req.origin || req.hostname}(${clientIp}) - `;
			log += `to ${req.originalUrl} - `;
			log += `using ${req.method} - `;
			log += `${res.locals.message}`;

			console.log(log);
		});

		next();
	};
};
