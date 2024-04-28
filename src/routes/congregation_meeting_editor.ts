import express from 'express';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	congregationMeetingEditorChecker,
	congregationPublicTalkCoordinatorChecker,
} from '../middleware/congregation-role-checker.js';
import { getApprovedVisitingSpeakersAccess } from '../controllers/congregation_meeting_editor_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationMeetingEditorChecker());

// activate public talk coordinator role
router.use(congregationPublicTalkCoordinatorChecker());

// get visiting speakers list
router.get('/:id/visiting-speakers-access', getApprovedVisitingSpeakersAccess);

export default router;
