import express from 'express';
import { body, header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor-checker.js';
import { congregationRoleChecker, congregationWeekendEditorChecker } from '../middleware/congregation-role-checker.js';
import {
	findVisitingSpeakersCongregations,
	getPublicTalks,
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

// update visiting speakers
router.get('/:id/visiting-speakers-congregations', header('name').isString().notEmpty(), findVisitingSpeakersCongregations);

export default router;
