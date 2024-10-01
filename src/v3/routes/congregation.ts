import express from 'express';
import { body, check } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	createCongregation,
	deleteApplication,
	getCongregationUpdates,
	getCongregations,
	getCountries,
	retrieveCongregationBackup,
	saveCongregationBackup,
	updateApplicationApproval,
} from '../controllers/congregation_controller.js';

const router = express.Router();

router.use(visitorChecker());

router.get('/countries', getCountries);

router.get('/search', getCongregations);

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

// save congregation backup
router.post('/:id/backup', check('lastbackup').isString(), body('cong_backup').isObject(), saveCongregationBackup);

// retrieve congregation backup
router.get('/:id/backup', retrieveCongregationBackup);

// get congregation updates
router.get('/:id/updates-routine', getCongregationUpdates);

// get congregation updates
router.patch('/:id/applications/:request', body('application').isObject().notEmpty(), updateApplicationApproval);

// get congregation updates
router.delete('/:id/applications/:request', deleteApplication);

export default router;
