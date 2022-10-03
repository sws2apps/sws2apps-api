// dependency
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// classes
import { Users } from '../classes/Users.js';

// get firestore
const db = getFirestore(); //get default database

export const getUsers = async () => {
	const userRef = db.collection('users');
	const snapshot = await userRef.get();

	let tmpUsers = [];

	snapshot.forEach((doc) => {
		let obj = {};
		obj.id = doc.id;
		obj.username = doc.data().about.name;
		obj.user_uid = doc.data().about?.user_uid || '';
		obj.sessions = doc.data().about?.sessions || [];
		obj.global_role = doc.data().about.role;
		obj.mfaEnabled = doc.data().about?.mfaEnabled || false;
		obj.cong_id = doc.data().congregation?.id || '';
		obj.cong_role = doc.data().congregation?.role || [];
		obj.pocket_local_id = doc.data().congregation?.local_id || '';
		obj.pocket_devices = doc.data().congregation?.devices || [];
		obj.pocket_oCode = doc.data().congregation?.oCode || '';
		obj.pocket_role = doc.data().congregation?.pocket_role || [];
		obj.pocket_members = doc.data().congregation?.pocket_members || [];
		tmpUsers.push(obj);
	});

	tmpUsers.sort((a, b) => {
		return a.username > b.username ? 1 : -1;
	});

	let finalResult = [];

	for (let i = 0; i < tmpUsers.length; i++) {
		const user = tmpUsers[i];

		let obj = {};
		obj.id = user.id;
		obj.user_uid = user.user_uid.toLowerCase();

		if (user.global_role === 'pocket') {
			obj.pocket_local_id = user.pocket_local_id;
			obj.pocket_devices = user.pocket_devices;
			obj.pocket_oCode = user.pocket_oCode;
			obj.pocket_role = user.pocket_role;
			obj.pocket_members = user.pocket_members;
		} else {
			const userRecord = await getAuth().getUserByEmail(user.user_uid);
			obj.auth_uid = userRecord.uid;
			obj.emailVerified = userRecord.emailVerified;
			obj.disabled = userRecord.disabled;
		}

		obj.cong_id = user.cong_id;
		obj.cong_name = '';
		obj.cong_number = '';

		if (user.cong_id.length > 0) {
			const congRef = db.collection('congregations').doc(user.cong_id);
			const docSnap = await congRef.get();
			const cong_name = docSnap.data().cong_name || '';
			const cong_number = docSnap.data().cong_number || '';

			obj.cong_name = cong_name;
			obj.cong_number = cong_number;
		}

		let lastSeens = user.sessions.map((session) => {
			return { last_seen: session.sws_last_seen };
		});

		lastSeens.sort((a, b) => {
			return a.last_seen > b.last_seen ? -1 : 1;
		});

		obj.mfaEnabled = user.mfaEnabled;
		obj.username = user.username;
		obj.global_role = user.global_role;
		obj.cong_role = user.cong_role;
		obj.sessions = user.sessions;
		obj.last_seen = lastSeens[0]?.last_seen || undefined;

		finalResult.push(obj);
	}

	return finalResult;
};

export const getUserInfo = async (userID) => {
	const users = await getUsers();
	const findUser = users.find((user) => user.user_uid === userID.toLowerCase());

	if (findUser) {
		return findUser;
	} else {
		return undefined;
	}
};

export const findUserById = async (id) => {
	const users = await getUsers();

	const findUser = users.find((user) => user.id === id);

	if (findUser) {
		return findUser;
	} else {
		return undefined;
	}
};

export const cleanExpiredSession = async (userID) => {
	const userDoc = db.collection('users').doc(userID);
	const userSnap = await userDoc.get();
	// remove expired sessions

	if (userSnap.exists) {
		let sessions = userSnap.data().about.sessions || [];
		const currentDate = new Date().getTime();
		let validSessions = sessions.filter(
			(session) => session.expires > currentDate
		);
		const data = {
			about: { ...userSnap.data().about, sessions: validSessions },
		};
		await db.collection('users').doc(userID).set(data, { merge: true });
	}
};

export const validateParamsId = (id) => {
	return id !== undefined;
};

export const userAccountChecker = async (id) => {
	try {
		const isParamsValid = validateParamsId(id);

		let obj = {};
		obj.isParamsValid = isParamsValid;

		if (isParamsValid) {
			const user = await findUserById(id);
			if (user) {
				obj.userFound = true;
				obj.user = user;
			} else {
				obj.userFound = false;
			}
		}

		return obj;
	} catch (err) {
		return err;
	}
};

export const getUserActiveSessions = async (userID) => {
	const user = Users.findUserById(userID);

	const result = user.sessions.map((session) => {
		let obj = {
			visitorid: session.visitorid,
			ip: session.visitor_details.ip,
			country_name: session.visitor_details.ipLocation.country.name,
			device: {
				browserName: session.visitor_details.browserDetails.browserName,
				os: session.visitor_details.browserDetails.os,
				osVersion: session.visitor_details.browserDetails.osVersion,
			},
			last_seen: session.sws_last_seen,
		};

		return obj;
	});

	return result;
};

export const revokeSessions = async (userID, visitorID) => {
	const user = Users.findUserById(userID);
	const newSessions = user.sessions.filter(
		(session) => session.visitorid !== visitorID
	);

	await db
		.collection('users')
		.doc(userID)
		.update({ 'about.sessions': newSessions });
};

export const getPocketUser = async (id) => {
	const users = await getUsers();

	const findUser = users.find((user) => user.pocket_local_id === id);

	if (findUser) {
		return findUser;
	} else {
		return undefined;
	}
};
