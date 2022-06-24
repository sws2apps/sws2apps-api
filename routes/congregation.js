// dependencies
import express from 'express';
import { body } from 'express-validator';

// middleware import
import { visitorChecker } from '../middleware/visitor-checker.js';

// import controller
import {
	getCongregationBackup,
	getLastCongregationBackup,
	requestCongregation,
	saveCongregationBackup,
} from '../controllers/congregation-controller.js';

const router = express.Router();

router.use(visitorChecker());

// request a new congregation
router.put(
	'/',
	body('email').isEmail(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('app_requestor').notEmpty(),
	requestCongregation
);

// get last backup information
router.get('/:id/backup/last', getLastCongregationBackup);

// save congregation backup
router.post(
	'/:id/backup',
	body('cong_persons').isArray(),
	body('cong_schedule').isArray(),
	body('cong_sourceMaterial').isArray(),
	saveCongregationBackup
);

// get last backup data
router.get('/:id/backup', getCongregationBackup);

export default router;
