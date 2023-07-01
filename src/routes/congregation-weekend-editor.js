import express from 'express';
import { body, header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor-checker.js';
import { congregationRoleChecker, congregationWeekendEditorChecker } from '../middleware/congregation-role-checker.js';
import {
	approveCongregationSpeakersRequest,
	findVisitingSpeakersCongregations,
	getCongregationSpeakersRequests,
	getCongregationSpeakersRequestsStatus,
	getPublicTalks,
	getVisitingSpeakers,
	requestAccessSpeakersCongregation,
	updateVisitingSpeakers,
	userBulkUpdatePublicTalks,
} from '../controllers/congregation-weekend-editor-controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationRoleChecker());
router.use(congregationWeekendEditorChecker());

// get public talks
router.get('/:id/public-talks', getPublicTalks);

// update public talks
router.post(
	'/:id/public-talks',
	body('language').isString().notEmpty(),
	body('talks').isArray().notEmpty(),
	userBulkUpdatePublicTalks
);

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

// get visiting speakers list
router.get('/:id/visiting-speakers', header('congs').isString().notEmpty(), getVisitingSpeakers);

export default router;
