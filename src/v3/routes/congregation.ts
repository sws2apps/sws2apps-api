import express from 'express';
import { body } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	createCongregation,
	deleteApplication,
	getCongregations,
	getCountries,
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

// get congregation updates
router.patch('/:id/applications/:request', body('application').isObject().notEmpty(), updateApplicationApproval);

// get congregation updates
router.delete('/:id/applications/:request', deleteApplication);

export default router;
