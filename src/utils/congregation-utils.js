import { getFirestore } from 'firebase-admin/firestore';
import { Congregation } from '../classes/Congregation.js';

const db = getFirestore(); //get default database

export const dbFetchCongregations = async () => {
	const congRef = db.collection('congregations');
	const snapshot = await congRef.get();

	const items = [];

	snapshot.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult = [];

	for (let i = 0; i < items.length; i++) {
		const cong = new Congregation(items[i]);
		await cong.loadDetails();
		finalResult.push(cong);
	}

	return finalResult;
};

export const serviceYearCurrent = () => {
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth();
	let current;

	if (currentMonth < 9) current = `${+currentYear - 1}-${currentYear}`;
	if (currentMonth >= 9) current = `${currentYear}-${+currentYear + 1}`;

	return current;
};

export const serviceYearExpired = (serviceYear) => {
	const current = serviceYearCurrent();
	const isExpired = +serviceYear.split('-')[0] < +current.split('-')[0] - 2;

	return isExpired;
};

export const serviceYearFromMonth = (month) => {
	const currentYear = new Date(month).getFullYear();
	const currentMonth = new Date(month).getMonth();
	let current;

	if (currentMonth < 8) current = `${+currentYear - 1}-${currentYear}`;
	if (currentMonth >= 8) current = `${currentYear}-${+currentYear + 1}`;

	return current;
};
