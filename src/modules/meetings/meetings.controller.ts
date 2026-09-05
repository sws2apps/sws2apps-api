import { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import type { OutgoingTalkScheduleType } from '#modules/congregations/index.js';
import {
	approveVisitingSpeakerAccess,
	getApprovedVisitingSpeakerAccess,
	getMeetingSchedules,
	getPendingVisitingSpeakerAccess,
	MeetingAccessError,
	publishMeetingSchedules,
	rejectVisitingSpeakerAccess,
	requestVisitingSpeakerAccess,
	searchVisitingSpeakerCongregations,
} from './meetings.service.js';

const getValidatedCongregationId = (req: Request, res: Response): string | undefined => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');
		return undefined;
	}

	return id;
};


const handleMeetingAccessError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof MeetingAccessError)) return false;

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'error_app_congregation_not-found', 'no congregation could not be found with the provided id');
		return true;
	}

	if (error.code === 'ACCESS_REQUEST_NOT_FOUND') {
		sendClientError(
			res,
			404,
			'error_app_speaker-access-request-not-found',
			'no speaker access request could be found with the provided id',
		);
		return true;
	}

	sendClientError(res, 403, 'error_api_unauthorized-request', 'user not authorized to access the provided congregation');
	return true;
};

const rethrowUnexpectedError = (error: unknown, res: Response) => {
	if (!handleMeetingAccessError(error, res)) throw error;
};

export const getApprovedVisitingSpeakersAccess = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const congregations = await getApprovedVisitingSpeakerAccess(congregationId, res.locals.currentUser.id);

		sendSuccess(res, { congregations }, 'user fetched congregation speakers access');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const findVisitingSpeakersCongregations = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const result = await searchVisitingSpeakerCongregations(
			congregationId,
			res.locals.currentUser.id,
			req.query.name as string,
		);

		sendSuccess(res, result, 'user fetched congregations visiting speakers list');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const requestAccessSpeakersCongregation = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	const targetCongregationId = req.body.cong_id as string;

	try {
		await requestVisitingSpeakerAccess(
			congregationId,
			res.locals.currentUser.id,
			targetCongregationId,
			req.body.key as string,
			req.body.request_id as string,
		);

		sendSuccess(res, { cong_id: targetCongregationId }, 'user requested access to a congregation outgoing speakers list');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const getPendingVisitingSpeakersAccess = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const result = await getPendingVisitingSpeakerAccess(congregationId, res.locals.currentUser.id);

		sendSuccess(res, result, 'user fetched congregation speakers pending access');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const approveVisitingSpeakersAccess = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const congregations = await approveVisitingSpeakerAccess(
			congregationId,
			res.locals.currentUser.id,
			req.body.request_id as string,
			req.body.key as string,
		);

		sendSuccess(res, { congregations }, 'user approved congregation speakers access');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const rejectVisitingSpeakersAccess = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const congregations = await rejectVisitingSpeakerAccess(
			congregationId,
			res.locals.currentUser.id,
			req.body.request_id as string,
		);

		sendSuccess(res, { congregations }, 'user rejected congregation speakers access');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const publishSchedules = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		await publishMeetingSchedules({
			congregationId,
			userId: res.locals.currentUser.id,
			sources: req.body.sources as unknown[],
			schedules: req.body.schedules as unknown[],
			talks: req.body.talks as OutgoingTalkScheduleType[] | undefined,
		});

		sendSuccess(res, { message: 'SCHEDULES_PUBLISHED' }, 'user published the schedules');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const getPublicSchedules = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const schedules = await getMeetingSchedules(congregationId, res.locals.currentUser.id);

		sendSuccess(res, schedules, 'user fetched congregations public schedules');
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};
