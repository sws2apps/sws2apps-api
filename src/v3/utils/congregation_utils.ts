import { OutgoingTalkScheduleType } from '../definition/congregation.js';
import { CongregationsList } from '../classes/Congregations.js';

export const loadIncomingTalks = async () => {
	for (const congregation of CongregationsList.list) {
		// check if already have incoming_talks
		const data = await congregation.getPublicIncomingTalks();
		if (data.length > 0) continue;

		// get all affected congregations
		const approvedCongs = congregation.outgoing_speakers.access.filter((record) => record.status === 'approved');

		const talks: OutgoingTalkScheduleType[] = [];

		for await (const approvedCong of approvedCongs) {
			const currentCong = CongregationsList.findById(approvedCong.cong_id)!;

			const childTalks = await currentCong.getPublicOutgoingTalks();

			if (childTalks.length > 0) {
				talks.push(...childTalks);
			}
		}

		const affectedTalks = talks.filter((record) => record.recipient === congregation.id);

		await congregation.savePublicIncomingTalks(affectedTalks);
	}
};
