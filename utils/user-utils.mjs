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
		obj.user_uid = doc.id;
		obj.username = doc.data().about.name;
		obj.global_role = doc.data().about.role;
		obj.mfaEnabled = doc.data().about.mfaEnabled;
		obj.cong_id = doc.data().congregation?.id || '';
		obj.cong_role = doc.data().congregation?.role || '';
		tmpUsers.push(obj);
	});

	tmpUsers.sort((a, b) => {
		return a.username > b.username ? 1 : -1;
	});

	let finalResult = [];
	for (let i = 0; i < tmpUsers.length; i++) {
		let obj = {};
		obj.user_uid = tmpUsers[i].user_uid;

		if (tmpUsers[i].global_role === 'pocket') {
			obj.disabled = tmpUsers[i].pocket_disabled;
		} else {
			const userRecord = await getAuth().getUserByEmail(tmpUsers[i].user_uid);
			obj.emailVerified = userRecord.emailVerified;
			obj.disabled = userRecord.disabled;
		}

		obj.cong_id = tmpUsers[i].cong_id;
		obj.cong_name = '';
		obj.cong_number = '';

		if (tmpUsers[i].cong_id.toString().length > 0) {
			const congRef = db
				.collection('congregation_data')
				.doc(tmpUsers[i].cong_id.toString());
			const docSnap = await congRef.get();
			const cong_name = docSnap.data().cong_name || '';
			const cong_number = docSnap.data().cong_number || '';

			obj.cong_name = cong_name;
			obj.cong_number = cong_number;
		}

		obj.mfaEnabled = tmpUsers[i].mfaEnabled;
		obj.username = tmpUsers[i].username;
		obj.global_role = tmpUsers[i].global_role;
		obj.cong_role = tmpUsers[i].cong_role;

		finalResult.push(obj);
	}

	return finalResult;
};

export const getUserInfo = async (userID) => {
	const users = await getUsers();

	const findUser = users.find((user) => user.user_uid === userID);

	if (findUser) {
		return findUser;
	} else {
		return undefined;
	}
};
