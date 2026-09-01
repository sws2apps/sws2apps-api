import { OutgoingTalkScheduleType } from '../types/congregations.types.js';
import type { Congregation } from '../congregation.js';
import {
	getPublicIncomingTalks,
	getPublicOutgoingTalks,
	saveCongregationPublicIncomingTalks,
} from './congregation-data.service.js';

type SpeakerAccess = {
	cong_id: string;
	status: string;
};

export type IncomingTalksCongregation = Pick<Congregation, 'id'> & {
	outgoing_speakers: { access: SpeakerAccess[] };
};

export type IncomingTalksDataAccess = {
	getIncomingTalks: (congregationId: string) => Promise<OutgoingTalkScheduleType[]>;
	getOutgoingTalks: (congregationId: string) => Promise<OutgoingTalkScheduleType[]>;
	saveIncomingTalks: (congregationId: string, talks: OutgoingTalkScheduleType[]) => Promise<void>;
};

const defaultDataAccess: IncomingTalksDataAccess = {
	getIncomingTalks: getPublicIncomingTalks,
	getOutgoingTalks: getPublicOutgoingTalks,
	saveIncomingTalks: saveCongregationPublicIncomingTalks,
};

/**
 * Initializes missing incoming-talk schedules from approved congregations.
 * Existing schedules are left untouched because this runs during startup.
 */
export const initializeIncomingTalks = async (
	congregations: IncomingTalksCongregation[],
	dataAccess: IncomingTalksDataAccess = defaultDataAccess,
): Promise<void> => {
	const congregationsById = new Map(
		congregations.map((congregation) => [congregation.id, congregation]),
	);

	for (const congregation of congregations) {
		const existingTalks = await dataAccess.getIncomingTalks(congregation.id);

		if (existingTalks.length > 0) {
			continue;
		}

		const approvedAccess = congregation.outgoing_speakers.access.filter(
			(access) => access.status === 'approved',
		);
		const availableTalks: OutgoingTalkScheduleType[] = [];

		for (const access of approvedAccess) {
			const sourceCongregation = congregationsById.get(access.cong_id);

			if (!sourceCongregation) {
				continue;
			}

			const outgoingTalks = await dataAccess.getOutgoingTalks(sourceCongregation.id);
			availableTalks.push(...outgoingTalks);
		}

		const incomingTalks = availableTalks.filter(
			(talk) => talk.recipient === congregation.id,
		);

		await dataAccess.saveIncomingTalks(congregation.id, incomingTalks);
	}
};
