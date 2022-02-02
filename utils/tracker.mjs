// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

export const tracker = async (clientIp, data) => {
	if (process.env.NODE_ENV !== 'testing') {
		const reqTrackRef = db.collection('request_tracker').doc(clientIp);
		const docSnap = await reqTrackRef.get();

		let failedLoginAttempt = docSnap.data().failedLoginAttempt;
		failedLoginAttempt = failedLoginAttempt + 1;

		if (data.failedLoginAttempt) {
			data = { ...data, failedLoginAttempt: failedLoginAttempt };
		}

		await db
			.collection('request_tracker')
			.doc(clientIp)
			.set(data, { merge: true });
	}
};
