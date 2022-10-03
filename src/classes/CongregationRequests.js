import { getFirestore } from 'firebase-admin/firestore';
import { Users } from './Users.js';

// get firestore
const db = getFirestore(); //get default database

const getCongregationsRequests = async () => {
	const congRef = db.collection('congregation_request');
	const snapshot = await congRef.get();

	let requests = [];

	snapshot.forEach((doc) => {
		if (doc.data().request_open) {
			let obj = { id: doc.id, request_date: doc.data().request_date };
			requests.push(obj);
		}
	});

	requests.sort((a, b) => {
		return a.request_date > b.request_date ? 1 : -1;
	});

	let finalResult = [];
	for (let i = 0; i < requests.length; i++) {
		const RequestClass = new CongregationRequest();
		const request = await RequestClass.loadDetails(requests[i].id);
		finalResult.push(request);
	}

	return finalResult;
};

class clsCongregationRequests {
	list = [];

	constructor() {}

	loadAll = async () => {
		this.list = await getCongregationsRequests();
	};

	findRequestByEmail = async () => {
		return this.list.find((request) => request.email === email);
	};

	createAccount = async (data) => {
		try {
			const reqRef = await db.collection('congregation_request').add(data);

			const ReqClass = new CongregationRequest();
			const request = await ReqClass.loadDetails(reqRef.id);

			this.list.push(request);

			this.list.sort((a, b) => {
				return a.request_date > b.request_date ? 1 : -1;
			});
		} catch (error) {
			throw new Error(error.message);
		}
	};
}

class CongregationRequest {
	id;
	cong_name = '';
	cong_number = '';
	email = '';
	username = '';
	user_id = '';
	cong_role = [];
	approved = false;
	request_date;
	request_open = true;

	constructor() {}

	loadDetails = async (id) => {
		const requestRef = db.collection('congregation_request').doc(id);
		const requestSnap = await requestRef.get();

		const request = new CongregationRequest();

		const user = await Users.findUserByEmail(requestSnap.doc().email);

		request.id = id;
		request.cong_name = requestSnap.doc().cong_name;
		request.cong_number = requestSnap.doc().cong_number;
		request.email = user.user_uid;
		request.username = user.username;
		request.user_id = user.id;
		request.cong_role = ['admin', requestSnap.doc().cong_role];
		request.approved = requestSnap.doc().approved;
		request.request_date = requestSnap.doc().request_date;
		request.request_open = requestSnap.doc().request_open;

		return request;
	};
}

export const CongregationRequests = new clsCongregationRequests();
