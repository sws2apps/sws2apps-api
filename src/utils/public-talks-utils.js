import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const dbFetchTalks = async () => {
	const publicTalksRef = db.collection('public_talks');
	const snapshot = await publicTalksRef.get();

	const finalResult = [];

	snapshot.forEach((doc) => {
		const obj = {
			id: doc.id,
			talk_number: doc.data().talk_number,
			talk_title: {
				...doc.data(),
			},
		};

		delete obj.talk_title.talk_number;

		finalResult.push(obj);
	});

	return finalResult;
};
