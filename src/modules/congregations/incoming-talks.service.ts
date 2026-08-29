import { OutgoingTalkScheduleType } from './congregations.types.js';

type SpeakerAccess = {
	cong_id: string;
	status: string;
};

export type IncomingTalksCongregation = {
	id: string;
	outgoing_speakers: {
		access: SpeakerAccess[];
	};
	getPublicIncomingTalks: () => Promise<OutgoingTalkScheduleType[]>;
	getPublicOutgoingTalks: () => Promise<OutgoingTalkScheduleType[]>;
	savePublicIncomingTalks: (
		talks: OutgoingTalkScheduleType[],
	) => Promise<void>;
};

/**
 * Initializes missing incoming-talk schedules from approved congregations.
 * Existing schedules are left untouched because this runs during startup.
 */
export const initializeIncomingTalks = async (
	congregations: IncomingTalksCongregation[],
): Promise<void> => {
	const congregationsById = new Map(
		congregations.map((congregation) => [congregation.id, congregation]),
	);

	for (const congregation of congregations) {
		const existingTalks = await congregation.getPublicIncomingTalks();

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

			const outgoingTalks = await sourceCongregation.getPublicOutgoingTalks();
			availableTalks.push(...outgoingTalks);
		}

		const incomingTalks = availableTalks.filter(
			(talk) => talk.recipient === congregation.id,
		);

		await congregation.savePublicIncomingTalks(incomingTalks);
	}
};
