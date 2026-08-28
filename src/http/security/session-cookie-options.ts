import type { Request } from 'express';

import { env } from '../../config/env.js';
import { buildSessionCookieOptions } from './cookies.js';

export const getSessionCookieOptions = (request: Request) => {
	return buildSessionCookieOptions(request.hostname, env.isProduction);
};
