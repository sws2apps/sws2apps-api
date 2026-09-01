import type { OutgoingTalkScheduleType } from '#modules/congregations/index.js';
import { CongregationsList } from '#modules/congregations/index.js';
import {
	prepareSchedulePublication,
	saveSchedulePublication,
} from './schedule-publication.js';
import {
	approveOutgoingSpeakerAccess,
	copyOutgoingTalkSchedule,
	getApprovedVisitingSpeakerCongregations,
	getPendingOutgoingSpeakerAccess,
	rejectOutgoingSpeakerAccess,
	requestOutgoingSpeakerAccess,
} from '#modules/congregations/index.js';
import { isCongregationMember } from '#modules/congregations/index.js';
import { findVisitingSpeakerCongregations } from './visiting-speaker-directory.js';

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
	if (!isCongregationMember(congregation, userId)) throw new MeetingAccessError('MEMBERSHIP_REQUIRED');

	return congregation;
};

export const getApprovedVisitingSpeakerAccess = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	return getApprovedVisitingSpeakerCongregations(congregation, CongregationsList.list);
};

export const searchVisitingSpeakerCongregations = async (congregationId: string, userId: string, name: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	return findVisitingSpeakerCongregations(
		CongregationsList.list,
		congregation.id,
		name,
	);
};

export const requestVisitingSpeakerAccess = async (
	congregationId: string,
	userId: string,
	targetCongregationId: string,
	key: string,
	requestId: string,
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const targetCongregation = CongregationsList.findById(targetCongregationId)!;
	await requestOutgoingSpeakerAccess(congregation, targetCongregation, key, requestId);
};

export const getPendingVisitingSpeakerAccess = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);

	return {
		congregations: getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list),
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
	await approveOutgoingSpeakerAccess(congregation, requestId, key);
	return getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list);
};

export const rejectVisitingSpeakerAccess = async (congregationId: string, userId: string, requestId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	await rejectOutgoingSpeakerAccess(congregation, requestId);
	return getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list);
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

	await saveSchedulePublication(congregation, publication);

	if (input.talks) {
		await copyOutgoingTalkSchedule(congregation, CongregationsList.list, input.talks);
	}
};

export const getMeetingSchedules = async (congregationId: string, userId: string) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const sources = await congregation.getPublicSources();
	const schedules = await congregation.getPublicSchedules();

	return { sources, schedules };
};
