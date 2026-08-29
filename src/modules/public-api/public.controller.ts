import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { formatError } from '../../http/validation-errors.js';
import {
	getPublicFeatureFlags,
	getPublicStats,
} from './public.service.js';

export const getStats = async (req: Request, res: Response) => {
	const publicStats = await getPublicStats();

	res.locals.type = 'info';
	res.locals.message = 'app stats generated';
	res.status(200).json(publicStats);
};

export const getFeatureFlags = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const installation = req.headers.installation as string;
	const userId = req.headers.user as string | undefined;
	const featureFlags = await getPublicFeatureFlags(installation, userId);

	res.locals.type = 'info';
	res.locals.message = 'app client fetched feature flags';
	res.status(200).json(featureFlags);
};
