import { encryptData } from '#platform/encryption/encryption.js';
import type { Congregation } from '../congregation.js';
import type {
	CongregationUpdatesType,
	CongRequestPendingType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
} from '../types/congregations.types.js';
import { setCongOutgoingSpeakers } from '../repositories/congregation-data.repository.js';

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
): Promise<void> => {
	targetCongregation.outgoing_speakers.access = targetCongregation.outgoing_speakers.access.filter(
		(access) => access.cong_id !== requestingCongregation.id,
	);

	targetCongregation.outgoing_speakers.access.push({
		cong_id: requestingCongregation.id,
		key: '',
		status: 'pending',
		updatedAt: new Date().toISOString(),
		temp_key: temporaryKey,
		request_id: requestId,
	});

	await saveOutgoingSpeakersState(
		requestingCongregation.id,
		targetCongregation.outgoing_speakers,
	);
};

export const getPendingOutgoingSpeakerAccess = (
	congregation: Congregation,
	congregations: Congregation[],
): CongRequestPendingType[] => {
	return congregation.outgoing_speakers.access
		.filter((access) => access.status === 'pending')
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
): Promise<void> => {
	const request = congregation.outgoing_speakers.access.find((access) => access.request_id === requestId)!;

	request.key = encryptData(JSON.stringify(speakersKey), request.temp_key);
	request.status = 'approved';
	request.updatedAt = new Date().toISOString();
	delete request.temp_key;

	await saveOutgoingSpeakersState(congregation.id, congregation.outgoing_speakers);
};

export const rejectOutgoingSpeakerAccess = async (
	congregation: Congregation,
	requestId: string,
): Promise<void> => {
	const request = congregation.outgoing_speakers.access.find((access) => access.request_id === requestId)!;

	request.status = 'disapproved';
	request.updatedAt = new Date().toISOString();
	delete request.temp_key;

	await saveOutgoingSpeakersState(congregation.id, congregation.outgoing_speakers);
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
		let schedules = await approvedCongregation.getPublicIncomingTalks();
		schedules = schedules.filter((record) => record.sender !== congregation.id);
		schedules.push(...talks.filter((record) => record.recipient === approvedCongregation.id));

		await approvedCongregation.savePublicIncomingTalks(schedules);
	}
};
