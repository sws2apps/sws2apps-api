import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const dbFetchTalks = async () => {
	const publicTalksRef = db.collection('public_talks');
	const snapshot = await publicTalksRef.get();

	const finalResult = [];

	snapshot.forEach((doc) => {
		finalResult.push({ id: doc.id, ...doc.data() });
	});

	return finalResult;
};
