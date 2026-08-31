import { Request, Response } from 'express';
import { getPublicFeatureFlags } from '../feature-flags/feature-flag-rollout.service.js';
import { getPublicStats } from './public.service.js';

export const getStats = async (req: Request, res: Response) => {
	const publicStats = await getPublicStats();

	res.locals.type = 'info';
	res.locals.message = 'app stats generated';
	res.status(200).json(publicStats);
};

export const getFeatureFlags = async (req: Request, res: Response) => {
	const installation = req.headers.installation as string;
	const userId = req.headers.user as string | undefined;
	const featureFlags = await getPublicFeatureFlags(installation, userId);

	res.locals.type = 'info';
	res.locals.message = 'app client fetched feature flags';
	res.status(200).json(featureFlags);
};

