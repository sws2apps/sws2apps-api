import express from 'express';
import { body } from 'express-validator';
import { requireAuthenticatedSession } from '../../http/middleware/session-authentication.middleware.js';
import { REQUEST_LIMITS } from '../../http/request-limits.js';
import { validateRequest } from '../../http/validation-errors.js';
import {
	requireMeetingEditor,
	requirePublicTalkCoordinator,
} from '../../http/middleware/authorization.middleware.js';
import {
	approveVisitingSpeakersAccess,
	findVisitingSpeakersCongregations,
	getApprovedVisitingSpeakersAccess,
	getPendingVisitingSpeakersAccess,
	getPublicSchedules,
	publishSchedules,
	rejectVisitingSpeakersAccess,
	requestAccessSpeakersCongregation,
} from './meetings.controller.js';

const meetingRouter = express.Router();

meetingRouter.use(requireAuthenticatedSession());
meetingRouter.use(requireMeetingEditor());

meetingRouter.post(
	'/:id/schedules',
	body('sources').isArray().notEmpty(),
	body('schedules').isArray().notEmpty(),
	body('talks').optional().isArray(),
	validateRequest,
	publishSchedules,
);

meetingRouter.get('/:id/schedules', getPublicSchedules);

meetingRouter.use(requirePublicTalkCoordinator());

meetingRouter.get('/:id/visiting-speakers/congregations', findVisitingSpeakersCongregations);

meetingRouter.get('/:id/visiting-speakers/access', getApprovedVisitingSpeakersAccess);

meetingRouter.post(
	'/:id/visiting-speakers/request',
	body('cong_id').isString().notEmpty(),
	body('request_id')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	body('key')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.securityValue }),
	validateRequest,
	requestAccessSpeakersCongregation,
);

meetingRouter.get('/:id/visiting-speakers/pending-access', getPendingVisitingSpeakersAccess);

meetingRouter.post(
	'/:id/visiting-speakers/request/approve',
	body('request_id')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	body('key')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.securityValue }),
	validateRequest,
	approveVisitingSpeakersAccess,
);

meetingRouter.post(
	'/:id/visiting-speakers/request/reject',
	body('request_id')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	validateRequest,
	rejectVisitingSpeakersAccess,
);

export default meetingRouter;

