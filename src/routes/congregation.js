import express from 'express';
import { body, check, oneOf } from 'express-validator';
import { congregationRoleChecker } from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	createCongregation,
	getCongregationBackup,
	getCongregations,
	getCountries,
	getLastCongregationBackup,
	getMeetingSchedules,
	saveCongregationBackup,
	sendPocketSchedule,
	updateCongregationInfo,
	postUserFieldServiceReports,
	unpostUserFieldServiceReports,
	getPendingFieldServiceReports,
	approvePendingFieldServiceReports,
	disapprovePendingFieldServiceReports,
} from '../controllers/congregation-controller.js';

const router = express.Router();

router.use(visitorChecker());

router.get('/countries', getCountries);

router.get(
	'/list-by-country',
	check('country').isString().notEmpty(),
	check('name').isString().isLength({ min: 2 }),
	getCongregations
);

// create a new congregation
router.put(
	'/',
	body('country_code').isString().notEmpty(),
	body('cong_name').isString().notEmpty(),
	body('cong_number').isNumeric(),
	body('app_requestor').isString().notEmpty(),
	body('fullname').isString().notEmpty(),
	createCongregation
);

// get meeting schedule
router.get('/:id/meeting-schedule', getMeetingSchedules);

// get last backup information
router.get('/:id/backup/last', getLastCongregationBackup);

// save congregation backup
router.post('/:id/backup', saveCongregationBackup);

// get last backup data
router.get('/:id/backup', getCongregationBackup);

// post field service reports
router.post(
	'/:id/field-service-reports',
	body('month').isString().notEmpty(),
	oneOf([body('placements').isEmpty(), body('placements').isNumeric()]),
	oneOf([body('videos').isEmpty(), body('placements').isNumeric()]),
	body('duration').isString(),
	oneOf([body('returnVisits').isEmpty(), body('returnVisits').isNumeric()]),
	oneOf([body('bibleStudies').isEmpty(), body('bibleStudies').isNumeric()]),
	body('comments').isString(),
	postUserFieldServiceReports
);

// unpost field service reports
router.delete('/:id/field-service-reports', body('month').isString().notEmpty(), unpostUserFieldServiceReports);

// activate role checker middleware
router.use(congregationRoleChecker());

// update congregation details
router.patch(
	'/:id',
	body('country_code').isString().notEmpty(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	updateCongregationInfo
);

// post new sws pocket schedule
router.post('/:id/schedule', body('schedules').isObject().notEmpty(), body('cong_settings').isArray(), sendPocketSchedule);

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
