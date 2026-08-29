import type { OutgoingTalkScheduleType } from '../congregations/congregations.types.js';
import { CongregationsList } from '../congregations/congregations.js';
import { prepareSchedulePublication } from './schedule-publication.js';

export type MeetingAccessErrorCode = 'CONGREGATION_NOT_FOUND' | 'MEMBERSHIP_REQUIRED';

export class MeetingAccessError extends Error {
	constructor(public readonly code: MeetingAccessErrorCode) {
		super(code);
		this.name = 'MeetingAccessError';
	}
}

const getAuthorizedCongregation = async (congregationId: string, userId: string) => {
	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) throw new MeetingAccessError('CONGREGATION_NOT_FOUND');
	if (!(await congregation.hasMember(userId))) throw new MeetingAccessError('MEMBERSHIP_REQUIRED');

	return congregation;
};

export const getApprovedVisitingSpeakerAccess = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	return congregation.getVisitingSpeakersAccessList();
};

export const searchVisitingSpeakerCongregations = async (congregationId: string, userId: string, name: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	return CongregationsList.findVisitingSpeakersCongregations(congregation.id, name);
};

export const requestVisitingSpeakerAccess = async (
	congregationId: string,
	userId: string,
	targetCongregationId: string,
	key: string,
	requestId: string,
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	await congregation.requestAccessCongregation(targetCongregationId, key, requestId);
};

export const getPendingVisitingSpeakerAccess = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);

	return {
		congregations: congregation.getPendingVisitingSpeakersAccessList(),
		speakers_key: congregation.outgoing_speakers.speakers_key,
		cong_master_key: congregation.settings.cong_master_key,
	};
};

export const approveVisitingSpeakerAccess = async (
	congregationId: string,
	userId: string,
	requestId: string,
	key: string,
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	await congregation.approveCongregationRequest(requestId, key);
	return congregation.getPendingVisitingSpeakersAccessList();
};

export const rejectVisitingSpeakerAccess = async (congregationId: string, userId: string, requestId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	await congregation.rejectCongregationRequest(requestId);
	return congregation.getPendingVisitingSpeakersAccessList();
};

type PublishMeetingSchedulesInput = {
	congregationId: string;
	userId: string;
	sources: unknown[];
	schedules: unknown[];
	talks?: OutgoingTalkScheduleType[];
};

export const publishMeetingSchedules = async (input: PublishMeetingSchedulesInput) => {
	const congregation = await getAuthorizedCongregation(input.congregationId, input.userId);
	const publication = prepareSchedulePublication(input);

	await congregation.publishSchedules(
		publication.serializedSources,
		publication.serializedSchedules,
		publication.serializedTalks,
	);

	if (input.talks) await congregation.copyOutgoingTalkSchedule(input.talks);
};

export const getMeetingSchedules = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const sources = await congregation.getPublicSources();
	const schedules = await congregation.getPublicSchedules();

	return { sources, schedules };
};
