// dependency
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

export const getUsers = async () => {
	const userRef = db.collection('users');
	const snapshot = await userRef.get();

	let tmpUsers = [];

	snapshot.forEach((doc) => {
		let obj = {};
		obj.userID = doc.id;
		obj.username = doc.data().about.name;
		obj.global_role = doc.data().about.role;
		obj.cong_id = doc.data().congregation?.id || '';
		obj.cong_role = doc.data().congregation?.role || [];
		tmpUsers.push(obj);
	});

	tmpUsers.sort((a, b) => {
		return a.username > b.username ? 1 : -1;
	});

	return tmpUsers;
};

export const getUserCongregationInfo = async (userID) => {
	const { congregation } = await getUserInfo(userID);
	const congID = congregation?.id;

	if (congID) {
		const congRef = db.collection('congregation_data').doc(congID.toString());
		const congSnap = await congRef.get();

		const congName = congSnap.data().cong_name;
		const congNumber = congSnap.data().cong_number;

		let obj = {};
		obj.cong_name = congName;
		obj.cong_number = congNumber;
		obj.cong_role = congregation.role;

		return obj;
	} else {
		return undefined;
	}
};

export const getUserInfo = async (userID) => {
	const userRef = db.collection('users').doc(userID);
	const userSnap = await userRef.get();

	if (userSnap.exists) {
		return { ...userSnap.data() };
	} else {
		return undefined;
	}
};
