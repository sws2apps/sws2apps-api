import type { NextFunction, Request, Response } from 'express';

import { env } from '#config/env.js';
import { isTrustedApplicationOrigin } from '#http/security/cors.js';
import { sendClientError } from '#http/responses.js';

export const requireTrustedBrowserOrigin = (isProduction = env.isProduction) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const origin = req.header('Origin');
		const isBrowserRequestAllowed = !origin || isTrustedApplicationOrigin(origin);

		if (!isProduction || isBrowserRequestAllowed) {
			next();
			return;
		}

		sendClientError(res, 403, 'ORIGIN_NOT_ALLOWED', 'request origin is not trusted');
	};
};
