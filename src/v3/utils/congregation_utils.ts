import { OutgoingTalkScheduleType } from '../definition/congregation.js';
import { CongregationsList } from '../classes/Congregations.js';

export const loadIncomingTalks = () => {
	for (const congregation of CongregationsList.list) {
		// get all affected congregations
		const approvedCongs = congregation.outgoing_speakers.access.filter((record) => record.status === 'approved');

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
