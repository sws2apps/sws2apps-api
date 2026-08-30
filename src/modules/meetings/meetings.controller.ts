import { Request, Response } from 'express';
import { rejectInvalidRequest } from '../../http/validation-errors.js';
import type { OutgoingTalkScheduleType } from '../congregations/congregations.types.js';
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
	if (rejectInvalidRequest(req, res)) return undefined;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });
		return undefined;
	}

	return id;
};

const handleMeetingAccessError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof MeetingAccessError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	res.locals.message = 'user not authorized to access the provided congregation';
	res.status(403).json({ message: 'error_api_unauthorized-request' });
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

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregation speakers access';
		res.status(200).json({ congregations });
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

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregations visiting speakers list';
		res.status(200).json(result);
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

		res.locals.type = 'info';
		res.locals.message = 'user requested access to a congregation outgoing speakers list';
		res.status(200).json({ cong_id: targetCongregationId });
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const getPendingVisitingSpeakersAccess = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const result = await getPendingVisitingSpeakerAccess(congregationId, res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregation speakers pending access';
		res.status(200).json(result);
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

		res.locals.type = 'info';
		res.locals.message = 'user approved congregation speakers access';
		res.status(200).json({ congregations });
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

		res.locals.type = 'info';
		res.locals.message = 'user rejected congregation speakers access';
		res.status(200).json({ congregations });
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

		res.locals.type = 'info';
		res.locals.message = 'user published the schedules';
		res.status(200).json({ message: 'SCHEDULES_PUBLISHED' });
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};

export const getPublicSchedules = async (req: Request, res: Response) => {
	const congregationId = getValidatedCongregationId(req, res);
	if (!congregationId) return;

	try {
		const schedules = await getMeetingSchedules(congregationId, res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregations public schedules';
		res.status(200).json(schedules);
	} catch (error) {
		rethrowUnexpectedError(error, res);
	}
};
