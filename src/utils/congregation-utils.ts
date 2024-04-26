import { getFirestore } from 'firebase-admin/firestore';
import { Congregation } from '../classes/Congregation.js';

const db = getFirestore(); //get default database

export const dbFetchCongregations = async () => {
	const congRef = db.collection('congregations');
	const snapshot = await congRef.get();

	const items: string[] = [];

	snapshot.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult: Congregation[] = [];

	for (let i = 0; i < items.length; i++) {
		const CongNew = new Congregation(items[i]);
		await CongNew.loadDetails();
		finalResult.push(CongNew);
	}

	return finalResult;
};
