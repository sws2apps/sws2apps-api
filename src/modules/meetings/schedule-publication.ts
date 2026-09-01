import type { Congregation } from '#modules/congregations/index.js';
import type { OutgoingTalkScheduleType } from '#modules/congregations/index.js';
import {
	getPublicSchedulesMetadata,
	getPublicSourcesMetadata,
} from '#modules/congregations/index.js';
import {
	setCongPublicOutgoingTalks,
	setCongPublicSchedules,
	setCongPublicSources,
} from '#modules/congregations/index.js';

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

type PreparedSchedulePublication = ReturnType<typeof prepareSchedulePublication>;

export const saveSchedulePublication = async (
	congregation: Congregation,
	publication: PreparedSchedulePublication,
): Promise<void> => {
	if (publication.serializedSources) {
		await setCongPublicSources(
			congregation.id,
			publication.serializedSources,
		);
		congregation.metadata.public_sources = await getPublicSourcesMetadata(
			congregation.id,
		);
	}

	if (publication.serializedSchedules) {
		await setCongPublicSchedules(
			congregation.id,
			publication.serializedSchedules,
		);
		congregation.metadata.public_schedules = await getPublicSchedulesMetadata(
			congregation.id,
		);
	}

	if (publication.serializedTalks) {
		await setCongPublicOutgoingTalks(
			congregation.id,
			publication.serializedTalks,
		);
	}
};
