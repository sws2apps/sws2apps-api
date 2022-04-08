// dependency
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';

// utils
import { getUsers } from './user-utils.mjs';

// get firestore
const db = getFirestore(); //get default database

export const getCongregations = async () => {
	const congRef = db.collection('congregation_data');
	let snapshot = await congRef.get();

	let congsList = [];

	snapshot.forEach((doc) => {
		let obj = {};
		obj.cong_id = +doc.id;
		obj.cong_name = doc.data().cong_name;
		obj.cong_number = doc.data().cong_number;
		congsList.push(obj);
	});

	congsList.sort((a, b) => {
		return a.cong_name > b.cong_name ? 1 : -1;
	});

	const usersList = await getUsers();

	let finalResult = [];
	for (let i = 0; i < congsList.length; i++) {
		let obj = {};
		obj.cong_members = [];

		for (let a = 0; a < usersList.length; a++) {
			if (congsList[i].cong_id === usersList[a].cong_id) {
				obj.cong_members.push({
					userID: usersList[a].userID,
					name: usersList[a].username,
					role: usersList[a].cong_role,
					global_role: usersList[a].global_role,
				});
			}
		}

		finalResult.push({ ...congsList[i], ...obj });
	}

	return finalResult;
};

export const getCongregationRequestInfo = async (request_id) => {
	const requestsRef = db.collection('congregation_request').doc(request_id);
	const requestsSnap = await requestsRef.get();

	if (requestsSnap.exists) {
		const cong_requestor_email = requestsSnap.data().email;
		const cong_name = requestsSnap.data().cong_name;
		const cong_number = requestsSnap.data().cong_number;
		const cong_role = ['admin', requestsSnap.data().cong_role];

		let obj = {};
		obj.cong_requestor_email = cong_requestor_email;
		obj.cong_name = cong_name;
		obj.cong_number = cong_number;
		obj.cong_role = cong_role;

		return obj;
	} else {
		return undefined;
	}
};

export const generateCongregationID = async () => {
	let setID = false;
	let num;

	do {
		const min = 1000000000;
		const max = 10000000000;

		num = crypto.randomInt(min, max);

		const congRef = db.collection('congregation_data').doc(num.toString());
		const docSnap = await congRef.get();

		if (!docSnap.exists) {
			setID = true;
		}
	} while (setID === false);
	return num;
};
