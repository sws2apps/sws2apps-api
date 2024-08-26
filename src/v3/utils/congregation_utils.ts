import { getFirestore } from 'firebase-admin/firestore';
import { Congregation } from '../classes/Congregation.js';
import { CongregationsList } from '../classes/Congregations.js';
import { OutgoingTalkScheduleType } from '../denifition/congregation.js';

const db = getFirestore(); //get default database

export const dbFetchCongregations = async () => {
	const congRef = db.collection('congregations_v3');
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

export const loadIncomingTalks = () => {
	for (const congregation of CongregationsList.list) {
		// get all affected congregations
		const approvedCongs = congregation.cong_outgoing_speakers.access.filter((record) => record.status === 'approved');

		const talks: OutgoingTalkScheduleType[] = [];

		for (const approvedCong of approvedCongs) {
			const currentCong = CongregationsList.findById(approvedCong.cong_id)!;

			const childTalks: OutgoingTalkScheduleType[] =
				currentCong.public_schedules.outgoing_talks.length === 0 ? [] : JSON.parse(currentCong.public_schedules.outgoing_talks);

			if (childTalks.length > 0) {
				talks.push(...childTalks);
			}
		}

		const affectedTalks = talks.filter((record) => record.recipient === congregation.id);

		congregation.public_schedules.incoming_talks = affectedTalks.length === 0 ? '' : JSON.stringify(affectedTalks);
	}
};
