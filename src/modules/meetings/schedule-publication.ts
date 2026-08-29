import type { OutgoingTalkScheduleType } from '../congregations/congregations.types.js';

type SchedulePublicationInput = {
	sources: unknown[];
	schedules: unknown[];
	talks?: OutgoingTalkScheduleType[];
};

export const prepareSchedulePublication = ({ sources, schedules, talks }: SchedulePublicationInput) => {
	return {
		serializedSources: JSON.stringify(sources),
		serializedSchedules: JSON.stringify(schedules),
		serializedTalks: talks ? JSON.stringify(talks) : undefined,
	};
};
