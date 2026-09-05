import { encryptData } from '#platform/encryption/encryption.js';
import type { Congregation } from '../congregation.js';
import type {
	CongregationUpdatesType,
	CongRequestPendingType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
} from '../types/congregations.types.js';
import { setCongOutgoingSpeakers } from '../repositories/congregation-data.repository.js';
import {
	getPublicIncomingTalks,
	saveCongregationPublicIncomingTalks,
} from './congregation-data.service.js';

export class OutgoingSpeakerAccessError extends Error {
	constructor(public readonly code: 'REQUEST_NOT_FOUND') {
		super(code);
		this.name = 'OutgoingSpeakerAccessError';
	}
}

export type OutgoingSpeakerAccessOperations = {
	saveState: typeof saveOutgoingSpeakersState;
	encrypt: typeof encryptData;
	getCurrentTimestamp: () => string;
};

export const saveOutgoingSpeakersState = async (
	congregationId: string,
	outgoingSpeakers: Pick<OutgoingSpeakersRecordType, 'list' | 'access'>,
): Promise<void> => {
	const storageData = JSON.stringify({
		list: outgoingSpeakers.list,
		access: outgoingSpeakers.access,
	});

	await setCongOutgoingSpeakers(congregationId, storageData);
};

const defaultAccessOperations: OutgoingSpeakerAccessOperations = {
	saveState: saveOutgoingSpeakersState,
	encrypt: encryptData,
	getCurrentTimestamp: () => new Date().toISOString(),
};

export const getApprovedVisitingSpeakerCongregations = (
	congregation: Congregation,
	congregations: Congregation[],
) => {
	return congregation.outgoing_speakers.access
		.filter((access) => access.status === 'approved')
		.filter((access) => congregations.some((record) => record.id === access.cong_id))
		.map((access) => {
			const approvedCongregation = congregations.find((record) => record.id === access.cong_id)!;

			return {
				cong_id: access.cong_id,
				request_id: access.request_id,
				cong_name: approvedCongregation.settings.cong_name,
			};
		});
};

export const requestOutgoingSpeakerAccess = async (
	requestingCongregation: Congregation,
	targetCongregation: Congregation,
	temporaryKey: string,
	requestId: string,
	operations: Partial<OutgoingSpeakerAccessOperations> = {},
): Promise<void> => {
	const accessOperations = { ...defaultAccessOperations, ...operations };
	const updatedAccess = targetCongregation.outgoing_speakers.access.filter(
		(access) => access.cong_id !== requestingCongregation.id,
	);

	updatedAccess.push({
		cong_id: requestingCongregation.id,
		key: '',
		status: 'pending',
		updatedAt: accessOperations.getCurrentTimestamp(),
		temp_key: temporaryKey,
		request_id: requestId,
	});

	await accessOperations.saveState(
		targetCongregation.id,
		{ ...targetCongregation.outgoing_speakers, access: updatedAccess },
	);
	targetCongregation.outgoing_speakers.access = updatedAccess;
};

export const getPendingOutgoingSpeakerAccess = (
	congregation: Congregation,
	congregations: Congregation[],
): CongRequestPendingType[] => {
	return congregation.outgoing_speakers.access
		.filter((access) => access.status === 'pending')
		.filter((access) => congregations.some((record) => record.id === access.cong_id))
		.map((access) => {
			const requestingCongregation = congregations.find((record) => record.id === access.cong_id)!;

			return {
				cong_id: access.cong_id,
				updatedAt: access.updatedAt,
				cong_name: requestingCongregation.settings.cong_name,
				country_code: requestingCongregation.settings.country_code,
				request_id: access.request_id,
			};
		});
};

export const approveOutgoingSpeakerAccess = async (
	congregation: Congregation,
	requestId: string,
	speakersKey: string,
	operations: Partial<OutgoingSpeakerAccessOperations> = {},
): Promise<void> => {
	const accessOperations = { ...defaultAccessOperations, ...operations };
	const updatedAccess = structuredClone(congregation.outgoing_speakers.access);
	const request = updatedAccess.find((access) => access.request_id === requestId);

	if (!request) throw new OutgoingSpeakerAccessError('REQUEST_NOT_FOUND');

	request.key = accessOperations.encrypt(JSON.stringify(speakersKey), request.temp_key);
	request.status = 'approved';
	request.updatedAt = accessOperations.getCurrentTimestamp();
	delete request.temp_key;

	await accessOperations.saveState(
		congregation.id,
		{ ...congregation.outgoing_speakers, access: updatedAccess },
	);
	congregation.outgoing_speakers.access = updatedAccess;
};

export const rejectOutgoingSpeakerAccess = async (
	congregation: Congregation,
	requestId: string,
	operations: Partial<OutgoingSpeakerAccessOperations> = {},
): Promise<void> => {
	const accessOperations = { ...defaultAccessOperations, ...operations };
	const updatedAccess = structuredClone(congregation.outgoing_speakers.access);
	const request = updatedAccess.find((access) => access.request_id === requestId);

	if (!request) throw new OutgoingSpeakerAccessError('REQUEST_NOT_FOUND');

	request.status = 'disapproved';
	request.updatedAt = accessOperations.getCurrentTimestamp();
	delete request.temp_key;

	await accessOperations.saveState(
		congregation.id,
		{ ...congregation.outgoing_speakers, access: updatedAccess },
	);
	congregation.outgoing_speakers.access = updatedAccess;
};

export const getRemoteSpeakerCongregations = (
	congregation: Congregation,
	congregations: Congregation[],
): CongregationUpdatesType['remote_congregations'] => {
	return congregations
		.filter((record) => record.outgoing_speakers.access.some((access) => {
			return access.cong_id === congregation.id && access.status === 'approved';
		}))
		.map((record) => {
			const access = record.outgoing_speakers.access.find((item) => {
				return item.cong_id === congregation.id && item.status === 'approved';
			})!;

			return {
				list: record.outgoing_speakers.list,
				cong_id: record.id,
				key: access.key,
				status: 'approved',
				updatedAt: access.updatedAt,
				cong_name: record.settings.cong_name,
				country_code: record.settings.country_code,
				request_id: access.request_id,
			};
		});
};

export const getRejectedSpeakerRequests = (
	congregation: Congregation,
	congregations: Congregation[],
): CongregationUpdatesType['rejected_requests'] => {
	return congregations
		.filter((record) => record.outgoing_speakers.access.some((access) => {
			return access.cong_id === congregation.id && access.status === 'disapproved';
		}))
		.map((record) => {
			const access = record.outgoing_speakers.access.find((item) => {
				return item.cong_id === congregation.id && item.status === 'disapproved';
			})!;

			return {
				cong_id: record.id,
				status: 'disapproved',
				updatedAt: access.updatedAt,
				cong_name: record.settings.cong_name,
				country_code: record.settings.country_code,
				request_id: access.request_id,
			};
		});
};

export const copyOutgoingTalkSchedule = async (
	congregation: Congregation,
	congregations: Congregation[],
	talks: OutgoingTalkScheduleType[],
): Promise<void> => {
	if (talks.length === 0) return;

	const approvedCongregations = congregations.filter((record) => {
		return record.outgoing_speakers.access.some((access) => {
			return access.cong_id === congregation.id && access.status === 'approved';
		});
	});

	for (const approvedCongregation of approvedCongregations) {
		let schedules = await getPublicIncomingTalks(approvedCongregation.id);
		schedules = schedules.filter((record) => record.sender !== congregation.id);
		schedules.push(...talks.filter((record) => record.recipient === approvedCongregation.id));

		await saveCongregationPublicIncomingTalks(approvedCongregation.id, schedules);
	}
};
