import { NextFunction, Request, Response } from 'express';
import { header, validationResult } from 'express-validator';
import { formatError } from '#http/validation-errors.js';
import {
	refreshAuthenticationSession,
	resolveAuthenticatedSession,
	resolvePocketSessionUser,
	verifyAuthenticationToken,
} from '#modules/auth/index.js';
import {
	extractBearerToken,
	validateBearerAuthorization,
} from '#http/security/bearer-token.js';
import { sendClientError } from '#http/responses.js';

export const requireAuthenticatedSession = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await header('Authorization')
				.exists()
				.notEmpty()
				.isString()
				.custom(validateBearerAuthorization)
				.run(req);

			const validationErrors = validationResult(req);

			if (!validationErrors.isEmpty()) {
				const validationMessage = formatError(validationErrors);

				sendClientError(res, 400, 'INPUT_INVALID', `invalid input: ${validationMessage}`);

				return;
			}

			// decode authorization
			const idToken = extractBearerToken(req.headers.authorization!)!;
			const authenticatedUserId = await verifyAuthenticationToken(idToken);

			if (!authenticatedUserId) {
				sendClientError(res, 403, 'LOGIN_FIRST', 'this user is not yet authenticated');
				return;
			}

			// get visitorid signed
			const visitorId = req.signedCookies.visitorid;
			if (!visitorId) {
				sendClientError(res, 403, 'DEVICE_REVOKED', 'the device the user is using was revoked');
				return;
			}

			const sessionResolution = resolveAuthenticatedSession(authenticatedUserId, visitorId);

			if (sessionResolution.status === 'user-not-found') {
				sendClientError(res, 403, 'ACCOUNT_NOT_FOUND', 'this user account no longer exists');
				return;
			}

			if (sessionResolution.status === 'session-not-found') {
				res.clearCookie('visitorid');
				sendClientError(
					res,
					403,
					'SESSION_REVOKED',
					'the visitor id is invalid or does not have an active session',
				);
				return;
			}

			const { user, session: activeSession } = sessionResolution;

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			if (user.profile.mfa_enabled) {
				const { mfaVerified } = activeSession;

				if (mfaVerified) {
					// update last seen
					await refreshAuthenticationSession({
						userId: user.id,
						visitorId,
						visitorIp: req.clientIp!,
						headers: req.headers,
					});
					next();
				} else {
					// allow verify token to pass this middleware
					if (req.path === '/verify-token') {
						next();
					} else {
						sendClientError(res, 401, 'LOGIN_FIRST', 'two factor authentication required');
					}
				}
			} else {
				// update last seen
				const lastSeenUpdatePaths = ['/validate-me'];
				if (lastSeenUpdatePaths.includes(req.path)) {
					await refreshAuthenticationSession({
						userId: user.id,
						visitorId,
						visitorIp: req.clientIp!,
						headers: req.headers,
					});
				}

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};

export const requirePocketSession = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// get visitorid signed
			const visitorId = req.signedCookies.visitorid;
			if (!visitorId) {
				sendClientError(res, 403, 'DEVICE_REVOKED', 'the device the user is using was revoked');
				return;
			}

			const user = resolvePocketSessionUser(visitorId);

			if (!user) {
				res.clearCookie('visitorid');
				sendClientError(res, 403, 'ACCOUNT_NOT_FOUND', 'this user account no longer exists');
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			// ignore path that update last seen
			const lastSeenUpdatePaths = ['/validate-me'];
			if (lastSeenUpdatePaths.includes(req.path)) {
				await refreshAuthenticationSession({
					userId: user.id,
					visitorId,
					visitorIp: req.clientIp!,
					headers: req.headers,
				});
			}

			next();
		} catch (err) {
			next(err);
		}
	};
};
