import { Request, Response } from 'express';
import { sendSuccess } from '#http/responses.js';
import { getPublicFeatureFlags } from '#modules/feature-flags/index.js';
import { getPublicStats } from './public.service.js';

export const getStats = async (req: Request, res: Response) => {
	const publicStats = await getPublicStats();

	sendSuccess(res, publicStats, 'app stats generated');
};

export const getFeatureFlags = async (req: Request, res: Response) => {
	const installation = req.headers.installation as string;
	const userId = req.headers.user as string | undefined;
	const featureFlags = await getPublicFeatureFlags(installation, userId);

	sendSuccess(res, featureFlags, 'app client fetched feature flags');
};
