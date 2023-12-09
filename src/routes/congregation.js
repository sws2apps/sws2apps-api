import express from 'express';
import { body, check, oneOf } from 'express-validator';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	createCongregation,
	getCongregationBackup,
	getCongregations,
	getCountries,
	getLastCongregationBackup,
	getMeetingSchedules,
	saveCongregationBackup,
	postUserFieldServiceReports,
	unpostUserFieldServiceReports,
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
	body('firstname').isString().notEmpty(),
	body('lastname').isString(),
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

export default router;
