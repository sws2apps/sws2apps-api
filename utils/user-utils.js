// dependency
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
		obj.user_uid = doc.data().about.user_uid;
		obj.sessions = doc.data().about.sessions || [];
		obj.global_role = doc.data().about.role;
		obj.mfaEnabled = doc.data().about.mfaEnabled;
		obj.cong_id = doc.data().congregation?.id || '';
		obj.cong_role = doc.data().congregation?.role || [];
		obj.pocket_disabled = doc.data().about.pocket_disabled || false;
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
			obj.disabled = user.pocket_disabled;
		} else {
			const userRecord = await getAuth().getUserByEmail(user.user_uid);
			obj.auth_uid = userRecord.uid;
			obj.emailVerified = userRecord.emailVerified;
			obj.disabled = userRecord.disabled;
		}

		obj.cong_id = user.cong_id;
		obj.cong_name = '';
		obj.cong_number = '';

		if (user.cong_id.toString().length > 0) {
			const congRef = db
				.collection('congregations')
				.doc(user.cong_id.toString());
			const docSnap = await congRef.get();
			const cong_name = docSnap.data().cong_name || '';
			const cong_number = docSnap.data().cong_number || '';

			obj.cong_name = cong_name;
			obj.cong_number = cong_number;
		}

		obj.mfaEnabled = user.mfaEnabled;
		obj.username = user.username;
		obj.global_role = user.global_role;
		obj.cong_role = user.cong_role;
		obj.sessions = user.sessions;

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
