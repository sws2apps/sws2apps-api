import type { RequestHandler } from 'express';
import {
	requireAuthenticatedSession,
	requirePocketSession,
} from '#http/middleware/session-authentication.middleware.js';
import type { SessionAuthenticationDependencies } from '#http/middleware/session-authentication.middleware.js';
import { sendClientError } from '#http/responses.js';

/** Cookie-only access is limited to Pocket accounts; VIP sessions still require their token and MFA. */
export const requireTerritorySession = (
	dependencies?: SessionAuthenticationDependencies,
): RequestHandler => {
	const authenticated = requireAuthenticatedSession(dependencies);
	const pocket = requirePocketSession(dependencies);
	return (req, res, next) => {
		if (req.headers.authorization || !req.signedCookies?.visitorid)
			return authenticated(req, res, next);
		return pocket(req, res, (error) => {
			if (error) return next(error);
			if (res.locals.currentUser?.profile.role !== 'pocket') {
				sendClientError(res, 403, 'LOGIN_FIRST', 'identity token required');
				return;
			}
			next();
		});
	};
};
