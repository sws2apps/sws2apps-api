import { getFirestore } from 'firebase-admin/firestore';
import { Announcement } from '../classes/Announcement.js';

const db = getFirestore();

export const dbFetchAnnouncements = async () => {
	const dbRef = db.collection('announcements');
	let dbSnap = await dbRef.get();

	const items = [];

	dbSnap.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult = [];

	for (let i = 0; i < items.length; i++) {
		const announcement = new Announcement(items[i]);
		await announcement.loadDetails();
		finalResult.push(announcement);
	}

	return finalResult;
};
