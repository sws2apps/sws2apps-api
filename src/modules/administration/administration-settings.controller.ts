import type { Request, Response } from 'express';

import {
	getMinimumClientVersion,
	updateMinimumClientVersion,
} from './administration-settings.service.js';

export const getClientVersion = async (_req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'admin fetched minimum client';
	res.status(200).json({ version: getMinimumClientVersion() });
};

export const updateClientVersion = async (req: Request, res: Response) => {
	const updatedVersion = await updateMinimumClientVersion(req.body.version as string);

	res.locals.type = 'info';
	res.locals.message = 'admin updated minimum client';
	res.status(200).json({ version: updatedVersion });
};

