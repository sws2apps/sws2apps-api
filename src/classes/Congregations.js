import { getFirestore } from 'firebase-admin/firestore';
import { Congregation } from './Congregation.js';

const db = getFirestore(); //get default database

export const getCongregations = async () => {
	const congRef = db.collection('congregations');
	const snapshot = await congRef.get();

	const congsList = [];

	snapshot.forEach((doc) => {
		congsList.push({ id: doc.id, username: doc.data().cong_name });
	});

	congsList.sort((a, b) => {
		return a.cong_name > b.cong_name ? 1 : -1;
	});

	const finalResult = [];

	for (let i = 0; i < congsList.length; i++) {
		const CongClass = new Congregation();
		const cong = await CongClass.loadDetails(congsList[i].id);
		finalResult.push(cong);
	}

	return finalResult;
};

class clsCongregations {
	list = [];

	constructor() {}

	loadAll = async () => {
		this.list = await getCongregations();
	};

	findCongregationById = (id) => {
		return this.list.find((cong) => cong.id === id);
	};
}

export const Congregations = new clsCongregations();
