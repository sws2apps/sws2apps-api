import { getFirestore } from 'firebase-admin/firestore';
import { Country } from '../classes/Country.js';

const db = getFirestore();

export const dbFetchCountries = async () => {
	const dbRef = db.collection('countries');
	let dbSnap = await dbRef.get();

	const items = [];

	dbSnap.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult = [];

	for (let i = 0; i < items.length; i++) {
		const country = new Country(items[i]);
		await country.loadDetails();
		finalResult.push(country);
	}

	return finalResult;
};
