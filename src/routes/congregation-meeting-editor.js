import express from 'express';
import { body, header } from 'express-validator';
import {
	congregationMeetingEditorChecker,
	congregationPublicTalkCoordinatorChecker,
} from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	approveCongregationSpeakersRequest,
	disapproveCongregationSpeakersRequest,
	findVisitingSpeakersCongregations,
	getApprovedVisitingSpeakersAccess,
	getCongregationSpeakersRequests,
	getCongregationSpeakersRequestsStatus,
	getPublicTalks,
	getVisitingSpeakers,
	requestAccessSpeakersCongregation,
	sendPocketSchedule,
	updateVisitingSpeakers,
	updateVisitingSpeakersAccess,
} from '../controllers/congregation-meeting-editor-controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationMeetingEditorChecker());

// post new sws pocket schedule
router.post('/:id/schedule', body('schedules').isObject().notEmpty(), body('cong_settings').isArray(), sendPocketSchedule);

router.use(congregationPublicTalkCoordinatorChecker());

// get public talks
router.get('/:id/public-talks', getPublicTalks);

// update visiting speakers
router.post('/:id/visiting-speakers', body('speakers').isArray().notEmpty(), updateVisitingSpeakers);

// get visiting speakers congregation
router.get('/:id/visiting-speakers-congregations', header('name').isString().notEmpty(), findVisitingSpeakersCongregations);

// request access to congregation speakers
router.post('/:id/request-speakers', body('cong_id').isString().notEmpty(), requestAccessSpeakersCongregation);

// get request speakers access list
router.get('/:id/request-speakers', getCongregationSpeakersRequests);

// check request speakers status
router.get('/:id/request-speakers-status', header('congs').isString(), getCongregationSpeakersRequestsStatus);

// approve congregation speakers request
router.patch('/:id/request-speakers/approve', header('cong_id').isString().notEmpty(), approveCongregationSpeakersRequest);

// disapprove congregation speakers request
router.patch('/:id/request-speakers/disapprove', header('cong_id').isString().notEmpty(), disapproveCongregationSpeakersRequest);

// get visiting speakers list
router.get('/:id/visiting-speakers', header('congs').isString().notEmpty(), getVisitingSpeakers);

// get visiting speakers list
router.get('/:id/visiting-speakers-access', getApprovedVisitingSpeakersAccess);

// update visiting speakers access
router.patch('/:id/visiting-speakers-access', body('congs').isArray().notEmpty(), updateVisitingSpeakersAccess);

export default router;
