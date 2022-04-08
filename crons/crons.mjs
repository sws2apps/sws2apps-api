// dependency
import schedule from 'node-schedule';
import { getFirestore } from 'firebase-admin/firestore';

// utils
import { getUsers } from '../utils/user-utils.mjs';
import { logger } from '../utils/logger.mjs';

// get firestore
const db = getFirestore(); //get default database

// session clean up, runs every day at 00:00
schedule.scheduleJob('0 0 * * *', async () => {
	try {
		logger('info', 'cleaning expired sessions: crons job started');
		const users = await getUsers();

		for (let i = 0; i < users.length; i++) {
			const email = users[i].userID;
			// get all users active sessions
			const userDoc = db.collection('users').doc(email);
			const userSnap = await userDoc.get();

			// remove expired sessions
			let sessions = userSnap.data().about.sessions || [];
			const currentDate = new Date().getTime();
			let validSessions = sessions.filter(
				(session) => session.expires > currentDate
			);
			const data = {
				about: { ...userSnap.data().about, sessions: validSessions },
			};
			await db.collection('users').doc(email).set(data, { merge: true });
		}
		logger('info', 'cleaning expired sessions: crons job completed');
	} catch (err) {
		logger('warn', `cleaning expired sessions: crons job error: ${err}`);
	}
});
