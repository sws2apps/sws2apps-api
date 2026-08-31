import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
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
	if (rejectInvalidRequest(req, res)) return;

	const updatedVersion = await updateMinimumClientVersion(req.body.version as string);

	res.locals.type = 'info';
	res.locals.message = 'admin updated minimum client';
	res.status(200).json({ version: updatedVersion });
};
