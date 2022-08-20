// dependency
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';

// utils
import { findUserById, getUserInfo, getUsers } from './user-utils.js';

// get firestore
const db = getFirestore(); //get default database

export const getCongregations = async () => {
	const congRef = db.collection('congregations');
	let snapshot = await congRef.get();

	let congsList = [];

	snapshot.forEach((doc) => {
		let obj = {};
		obj.cong_id = doc.id;
		obj.cong_name = doc.data().cong_name;
		obj.cong_number = doc.data().cong_number;
		obj.last_backup = doc.data().last_backup;
		obj.cong_persons = doc.data().cong_persons || '';
		obj.cong_sourceMaterial = doc.data().cong_sourceMaterial || [];
		obj.cong_schedule = doc.data().cong_schedule || [];
		obj.cong_sourceMaterial_draft = doc.data().cong_sourceMaterial_draft || [];
		obj.cong_schedule_draft = doc.data().cong_schedule_draft || [];
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
			if (
				usersList[a].global_role === 'vip' &&
				congsList[i].cong_id === usersList[a].cong_id
			) {
				obj.cong_members.push({
					id: usersList[a].id,
					user_uid: usersList[a].user_uid,
					name: usersList[a].username,
					role: usersList[a].cong_role,
					global_role: usersList[a].global_role,
					last_seen: usersList[a].last_seen,
				});
			}
		}

		if (congsList[i].last_backup) {
			obj.last_backup = {};

			const fDate = Date.parse(
				congsList[i].last_backup.date.toDate().toString()
			);
			obj.last_backup.date = fDate;

			const user = await findUserById(congsList[i].last_backup.by);
			obj.last_backup.by = user.username;
		}

		finalResult.push({ ...congsList[i], ...obj });
	}

	return finalResult;
};

export const getCongregationInfo = async (congID) => {
	const congs = await getCongregations();

	const findCongregation = congs.find((cong) => cong.cong_id === congID);

	if (findCongregation) {
		return findCongregation;
	} else {
		return undefined;
	}
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

		const congRef = db.collection('congregations').doc(num.toString());
		const docSnap = await congRef.get();

		if (!docSnap.exists) {
			setID = true;
		}
	} while (setID === false);
	return num;
};

export const getCongregationsRequests = async () => {
	const congRef = db.collection('congregation_request');
	const snapshot = await congRef.get();

	let requests = [];

	snapshot.forEach((doc) => {
		if (doc.data().request_open) {
			let obj = { id: doc.id, ...doc.data() };
			requests.push(obj);
		}
	});

	requests.sort((a, b) => {
		return a.request_date > b.request_date ? 1 : -1;
	});

	let finalResult = [];
	for (let i = 0; i < requests.length; i++) {
		const request = requests[i];
		const user = await getUserInfo(request.email);

		let obj = {};
		obj.id = request.id;
		obj.cong_name = request.cong_name;
		obj.cong_number = request.cong_number;
		obj.email = user.user_uid;
		obj.username = user.username;
		obj.user_id = user.id;
		obj.cong_role = ['admin', request.cong_role];
		obj.approved = request.approved;
		obj.request_date = request.request_date;
		obj.request_open = request.request_open;

		finalResult.push(obj);
	}

	return finalResult;
};

export const findCongregationRequestByEmail = async (email) => {
	const requests = await getCongregationsRequests();
	const userRequest = requests.find((request) => request.email === email);

	return userRequest;
};

export const findCongregationRequestById = async (id) => {
	const requests = await getCongregationsRequests();
	const congRequest = requests.find((request) => request.id === id);

	return congRequest;
};

export const checkCongregationMember = async (user_email, cong_id) => {
	const user = await getUserInfo(user_email);

	return user.cong_id === cong_id;
};
