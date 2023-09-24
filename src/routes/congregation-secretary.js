import express from 'express';
import { body } from 'express-validator';
import { congregationSecretaryChecker } from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	approvePendingFieldServiceReports,
	disapprovePendingFieldServiceReports,
	getPendingFieldServiceReports,
} from '../controllers/congregation-secretary-controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationSecretaryChecker());

// get pending field service reports
router.get('/:id/field-service-reports', getPendingFieldServiceReports);

// approve pending field service reports
router.patch(
	'/:id/field-service-reports/approve',
	body('user_local_uid').isString().notEmpty(),
	body('month').isString().notEmpty(),
	approvePendingFieldServiceReports
);

// diapprove pending field service reports
router.patch(
	'/:id/field-service-reports/disapprove',
	body('user_local_uid').isString().notEmpty(),
	body('month').isString().notEmpty(),
	disapprovePendingFieldServiceReports
);

export default router;
