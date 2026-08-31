import express from 'express';
import { header } from 'express-validator';
import { validateRequest } from '../../http/validation-errors.js';
import { getFeatureFlags, getStats } from './public.controller.js';

const publicApiRouter = express.Router();

publicApiRouter.get('/stats', getStats);

publicApiRouter.get(
	'/feature-flags',
	header('installation').isString().notEmpty(),
	header('user').isString(),
	validateRequest,
	getFeatureFlags,
);

export default publicApiRouter;

