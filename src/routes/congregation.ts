import express from 'express';
import { body, check } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	createCongregation,
	getCongregations,
	getCountries,
	getLastCongregationBackup,
	saveCongregationBackup,
} from '../controllers/congregation_controller.js';

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

// get last backup information
router.get('/:id/backup/last', getLastCongregationBackup);

// save congregation backup
router.post('/:id/backup', saveCongregationBackup);

export default router;
