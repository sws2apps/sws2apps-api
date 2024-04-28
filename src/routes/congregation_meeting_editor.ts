import express from 'express';
import { header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	congregationMeetingEditorChecker,
	congregationPublicTalkCoordinatorChecker,
} from '../middleware/congregation_role_checker.js';
import {
	findVisitingSpeakersCongregations,
	getApprovedVisitingSpeakersAccess,
} from '../controllers/congregation_meeting_editor_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationMeetingEditorChecker());

// activate public talk coordinator role
router.use(congregationPublicTalkCoordinatorChecker());

// find visiting speakears congregations
router.get('/:id/visiting-speakers-congregations', header('name').isString().notEmpty(), findVisitingSpeakersCongregations);

// get visiting speakers list
router.get('/:id/visiting-speakers-access', getApprovedVisitingSpeakersAccess);

export default router;
