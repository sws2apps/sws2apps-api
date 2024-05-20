import express from 'express';
import { body, header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	congregationMeetingEditorChecker,
	congregationPublicTalkCoordinatorChecker,
} from '../middleware/congregation_role_checker.js';
import {
	approveVisitingSpeakersAccess,
	findVisitingSpeakersCongregations,
	getApprovedVisitingSpeakersAccess,
	getPendingVisitingSpeakersAccess,
	rejectVisitingSpeakersAccess,
	requestAccessSpeakersCongregation,
} from '../controllers/congregation_meeting_editor_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationMeetingEditorChecker());

// activate public talk coordinator role
router.use(congregationPublicTalkCoordinatorChecker());

// find visiting speakears congregations
router.get('/:id/visiting-speakers/congregations', header('name').isString().notEmpty(), findVisitingSpeakersCongregations);

// get visiting speakers list
router.get('/:id/visiting-speakers/access', getApprovedVisitingSpeakersAccess);

// request access to congregation speakers
router.post(
	'/:id/visiting-speakers/request',
	body('cong_id').isString().notEmpty(),
	body('request_id').isString().notEmpty(),
	body('key').isString().notEmpty(),
	requestAccessSpeakersCongregation
);

// get visiting speakers pending access
router.get('/:id/visiting-speakers/pending-access', getPendingVisitingSpeakersAccess);

// approve request access to congregation speakers
router.post(
	'/:id/visiting-speakers/request/approve',
	body('request_id').isString().notEmpty(),
	body('key').isString().notEmpty(),
	approveVisitingSpeakersAccess
);

// reject request access to congregation speakers
router.post('/:id/visiting-speakers/request/reject', body('request_id').isString().notEmpty(), rejectVisitingSpeakersAccess);

export default router;
