import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env.js';
import { isTrustedApplicationOrigin } from '../security/cors.js';

export const requireTrustedBrowserOrigin = (isProduction = env.isProduction) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const origin = req.header('Origin');
		const isBrowserRequestAllowed = !origin || isTrustedApplicationOrigin(origin);

		if (!isProduction || isBrowserRequestAllowed) {
			next();
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'request origin is not trusted';
		res.status(403).json({ message: 'ORIGIN_NOT_ALLOWED' });
	};
};
