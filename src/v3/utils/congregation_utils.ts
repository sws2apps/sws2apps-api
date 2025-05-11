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

export const syncFromIncoming = <T extends object>(local: T, remote: T): T => {
	const objectKeys = Object.keys(remote).filter((key) => {
		const objKey = key as keyof object;

		return remote[objKey] !== null && typeof remote[objKey] === 'object';
	}) as (keyof object)[];

	for (const key of objectKeys) {
		if (local[key] && typeof local[key] === 'object') {
			if (!('updatedAt' in remote[key])) {
				syncFromIncoming(local[key], remote[key]);
			} else {
				if (remote[key]['updatedAt'] > local[key]['updatedAt']) {
					local[key] = remote[key];
				}
			}
		} else {
			local[key] = remote[key];
		}
	}

	return local;
};
