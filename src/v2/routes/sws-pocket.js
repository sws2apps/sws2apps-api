import express from 'express';
import { body, oneOf } from 'express-validator';
import {
	getLastUserBackup,
	getSchedule,
	getUserBackup,
	pocketDeleteDevice,
	pocketSignUp,
	postPocketFieldServiceReports,
	saveUserBackup,
	unpostPocketFieldServiceReports,
	validatePocket,
} from '../controllers/sws-pocket-controller.js';
import { getUserDevices } from '../controllers/sws-pocket-controller.js';
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.js';

const router = express.Router();

router.post('/signup', body('visitorid').notEmpty(), body('otp_code').isLength({ min: 10 }).contains('-'), pocketSignUp);

// activate auth checker middleware
router.use(pocketAuthChecker());

router.get('/validate-me', validatePocket);

router.get('/meeting-schedule', getSchedule);

// get user sessions
router.get('/:id/devices', getUserDevices);

// delete pocket device
router.delete('/:id/devices', body('pocket_visitorid').notEmpty(), pocketDeleteDevice);

// get last backup information
router.get('/:id/backup/last', getLastUserBackup);

// save user backup
router.post('/:id/backup', saveUserBackup);

// get last backup data
router.get('/:id/backup', getUserBackup);

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
	postPocketFieldServiceReports
);

// unpost field service reports
router.delete('/:id/field-service-reports', body('month').isString().notEmpty(), unpostPocketFieldServiceReports);

export default router;
