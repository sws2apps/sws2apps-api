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
import {
	getPublicSchedules,
	getPublicSources,
} from '#modules/congregations/index.js';

export type MeetingAccessErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'ACCESS_REQUEST_NOT_FOUND';

export class MeetingAccessError extends Error {
	constructor(public readonly code: MeetingAccessErrorCode) {
		super(code);
		this.name = 'MeetingAccessError';
	}
}

type MeetingServiceDependencies = {
	requestSpeakerAccess: typeof requestOutgoingSpeakerAccess;
	approveSpeakerAccess: typeof approveOutgoingSpeakerAccess;
	rejectSpeakerAccess: typeof rejectOutgoingSpeakerAccess;
	savePublication: typeof saveSchedulePublication;
	copyTalkSchedule: typeof copyOutgoingTalkSchedule;
	getSchedules: typeof getPublicSchedules;
	getSources: typeof getPublicSources;
};

const defaultMeetingServiceDependencies: MeetingServiceDependencies = {
	requestSpeakerAccess: requestOutgoingSpeakerAccess,
	approveSpeakerAccess: approveOutgoingSpeakerAccess,
	rejectSpeakerAccess: rejectOutgoingSpeakerAccess,
	savePublication: saveSchedulePublication,
	copyTalkSchedule: copyOutgoingTalkSchedule,
	getSchedules: getPublicSchedules,
	getSources: getPublicSources,
};

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
	dependencies: Partial<MeetingServiceDependencies> = {},
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const targetCongregation = CongregationsList.findById(targetCongregationId);
	if (!targetCongregation) throw new MeetingAccessError('CONGREGATION_NOT_FOUND');

	const { requestSpeakerAccess } = { ...defaultMeetingServiceDependencies, ...dependencies };
	await requestSpeakerAccess(congregation, targetCongregation, key, requestId);
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
	dependencies: Partial<MeetingServiceDependencies> = {},
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const requestExists = congregation.outgoing_speakers.access.some((request) => {
		return request.request_id === requestId;
	});
	if (!requestExists) throw new MeetingAccessError('ACCESS_REQUEST_NOT_FOUND');

	const { approveSpeakerAccess } = { ...defaultMeetingServiceDependencies, ...dependencies };
	await approveSpeakerAccess(congregation, requestId, key);
	return getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list);
};

export const rejectVisitingSpeakerAccess = async (
	congregationId: string,
	userId: string,
	requestId: string,
	dependencies: Partial<MeetingServiceDependencies> = {},
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const requestExists = congregation.outgoing_speakers.access.some((request) => {
		return request.request_id === requestId;
	});
	if (!requestExists) throw new MeetingAccessError('ACCESS_REQUEST_NOT_FOUND');

	const { rejectSpeakerAccess } = { ...defaultMeetingServiceDependencies, ...dependencies };
	await rejectSpeakerAccess(congregation, requestId);
	return getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list);
};

type PublishMeetingSchedulesInput = {
	congregationId: string;
	userId: string;
	sources: unknown[];
	schedules: unknown[];
	talks?: OutgoingTalkScheduleType[];
};

export const publishMeetingSchedules = async (
	input: PublishMeetingSchedulesInput,
	dependencies: Partial<MeetingServiceDependencies> = {},
) => {
	const congregation = await getAuthorizedCongregation(input.congregationId, input.userId);
	const publication = prepareSchedulePublication(input);
	const operations = { ...defaultMeetingServiceDependencies, ...dependencies };

	await operations.savePublication(congregation, publication);

	if (input.talks) {
		await operations.copyTalkSchedule(congregation, CongregationsList.list, input.talks);
	}
};

export const getMeetingSchedules = async (
	congregationId: string,
	userId: string,
	dependencies: Partial<MeetingServiceDependencies> = {},
) => {
	const congregation = await getAuthorizedCongregation(congregationId, userId);
	const operations = { ...defaultMeetingServiceDependencies, ...dependencies };
	const sources = await operations.getSources(congregation.id);
	const schedules = await operations.getSchedules(congregation.id);

	return { sources, schedules };
};
