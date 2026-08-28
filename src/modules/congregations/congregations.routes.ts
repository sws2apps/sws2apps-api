import express from 'express';
import { body, query } from 'express-validator';
import { requireAuthenticatedSession } from '../../http/middleware/session-authentication.middleware.js';
import {
	createCongregation,
	deleteApplication,
	getCongregations,
	getCountries,
	updateApplicationApproval,
} from './congregations.controller.js';

const congregationRouter = express.Router();

congregationRouter.use(requireAuthenticatedSession());

congregationRouter.get('/countries', query('language').optional().isString(), getCountries);

congregationRouter.get(
	'/search',
	query('country').isString().notEmpty(),
	query('name').isString().isLength({ min: 2 }),
	query('language').optional().isString(),
	getCongregations,
);

congregationRouter.put(
	'/',
	body('country_code').isString().notEmpty(),
	body('country_guid').isString().notEmpty(),
	body('cong_name').isString().notEmpty(),
	body('firstname').isString().notEmpty(),
	body('lastname').isString(),
	createCongregation,
);

congregationRouter.patch(
	'/:id/applications/:request',
	body('application').isObject().notEmpty(),
	updateApplicationApproval,
);

congregationRouter.delete('/:id/applications/:request', deleteApplication);

export default congregationRouter;
