import express from 'express';
import { body, query } from 'express-validator';
import { requireAuthenticatedSession } from '#http/middleware/session-authentication.middleware.js';
import { validateRequest } from '#http/validation-errors.js';
import {
	deleteApplication,
	updateApplicationApproval,
} from './congregation-applications.controller.js';
import {
	createCongregation,
} from './congregation-creation.controller.js';
import {
	getCongregations,
	getCountries,
} from './congregation-directory.controller.js';

const congregationRouter = express.Router();

congregationRouter.use(requireAuthenticatedSession());

congregationRouter.get('/countries', query('language').optional().isString(), validateRequest, getCountries);

congregationRouter.get(
	'/search',
	query('country').isString().notEmpty(),
	query('name').isString().isLength({ min: 2 }),
	query('language').optional().isString(),
	validateRequest,
	getCongregations,
);

congregationRouter.put(
	'/',
	body('country_code').isString().notEmpty(),
	body('country_guid').isString().notEmpty(),
	body('cong_name').isString().notEmpty(),
	body('firstname').isString().notEmpty(),
	body('lastname').isString(),
	validateRequest,
	createCongregation,
);

congregationRouter.patch(
	'/:id/applications/:request',
	body('application').isObject().notEmpty(),
	validateRequest,
	updateApplicationApproval,
);

congregationRouter.delete('/:id/applications/:request', deleteApplication);

export default congregationRouter;
