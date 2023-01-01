import dayjs from 'dayjs';
import { getFirestore } from 'firebase-admin/firestore';
import { congregationRequests } from './CongregationRequests.js';
import { users } from './Users.js';

const db = getFirestore();

class CongregationRequest {
	constructor(id) {
		this.id = id;
		this.cong_name = '';
		this.cong_number = '';
		this.email = '';
		this.username = '';
		this.user_id = '';
		this.cong_role = [];
		this.approved = false;
		this.request_date = '';
		this.request_open = true;
	}
}

CongregationRequest.prototype.loadDetails = async function () {
	const requestRef = db.collection('congregation_request').doc(this.id);
	const requestSnap = await requestRef.get();

	const user = await users.findUserByEmail(requestSnap.data().email);

	this.cong_name = requestSnap.data().cong_name;
	this.cong_number = requestSnap.data().cong_number;
	this.email = user.user_uid;
	this.username = user.username;
	this.user_id = user.id;
	this.cong_role = ['admin', requestSnap.data().cong_role];
	this.approved = requestSnap.data().approved;
	this.request_date = dayjs.unix(requestSnap.data().request_date._seconds).$d;
	this.request_open = requestSnap.data().request_open;
};

CongregationRequest.prototype.approve = async function () {
	const requestData = { approved: true, request_open: false };
	await db.collection('congregation_request').doc(this.id).set(requestData, { merge: true });

	congregationRequests.list = congregationRequests.list.filter((item) => item.id !== this.id);
};

CongregationRequest.prototype.disapprove = async function () {
	const requestData = { approved: false, request_open: false };
	await db.collection('congregation_request').doc(this.id).set(requestData, { merge: true });

	congregationRequests.list = congregationRequests.list.filter((item) => item.id !== this.id);
};

export default CongregationRequest;
