import type { Request, Response } from 'express';
import { sendSuccess } from '#http/responses.js';

import {
	getMinimumClientVersion,
	updateMinimumClientVersion,
} from './administration-settings.service.js';

export const getClientVersion = async (_req: Request, res: Response) => {
	sendSuccess(res, { version: getMinimumClientVersion() }, 'admin fetched minimum client');
};

export const updateClientVersion = async (req: Request, res: Response) => {
	const updatedVersion = await updateMinimumClientVersion(req.body.version as string);

	sendSuccess(res, { version: updatedVersion }, 'admin updated minimum client');
};
