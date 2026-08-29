import { NextFunction, Request, Response } from 'express';
import { header, validationResult } from 'express-validator';
import { UsersList } from '../../v3/classes/Users.js';
import { formatError } from '../validation-errors.js';
import { verifyFirebaseIdToken } from '../../platform/firebase/authentication.js';
import {
	extractBearerToken,
	validateBearerAuthorization,
} from '../security/bearer-token.js';

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

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${validationMessage}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			// decode authorization
			const idToken = extractBearerToken(req.headers.authorization!)!;
			const authenticatedUserId = await verifyFirebaseIdToken(idToken);

			if (!authenticatedUserId) {
				res.locals.type = 'warn';
				res.locals.message = 'this user is not yet authenticated';
				res.status(403).json({ message: 'LOGIN_FIRST' });
				return;
			}

			// get visitorid signed
			const visitorId = req.signedCookies.visitorid;
			if (!visitorId) {
				res.locals.type = 'warn';
				res.locals.message = 'the device the user is using was revoked';
				res.status(403).json({ message: 'DEVICE_REVOKED' });
				return;
			}

			const user = UsersList.findByAuthUid(authenticatedUserId);

			if (!user) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';
				res.status(403).json({ message: 'ACCOUNT_NOT_FOUND' });
				return;
			}

			// get user session
			const userSessions = user.sessions;

			// find if visitor id has valid session
			const activeSession = userSessions!.find((session) => session.visitorid === visitorId);

			if (!activeSession) {
				res.locals.type = 'warn';
				res.locals.message = 'the visitor id is invalid or does not have an active session';

				res.clearCookie('visitorid');
				res.status(403).json({ message: 'SESSION_REVOKED' });
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			if (user.profile.mfa_enabled) {
				const { mfaVerified } = activeSession;

				if (mfaVerified) {
					// update last seen
					await user.updateSessionLastSeen(visitorId, req);
					next();
				} else {
					// allow verify token to pass this middleware
					if (req.path === '/verify-token') {
						next();
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'two factor authentication required';
						res.status(401).json({ message: 'LOGIN_FIRST' });
					}
				}
			} else {
				// update last seen
				const lastSeenUpdatePaths = ['/validate-me'];
				if (lastSeenUpdatePaths.includes(req.path)) {
					await user.updateSessionLastSeen(visitorId, req);
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
				res.locals.type = 'warn';
				res.locals.message = 'the device the user is using was revoked';
				res.status(403).json({ message: 'DEVICE_REVOKED' });
				return;
			}

			const user = UsersList.findByVisitorId(visitorId);

			if (!user) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';

				res.clearCookie('visitorid');
				res.status(403).json({ message: 'ACCOUNT_NOT_FOUND' });
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			// ignore path that update last seen
			const lastSeenUpdatePaths = ['/validate-me'];
			if (lastSeenUpdatePaths.includes(req.path)) {
				await user.updateSessionLastSeen(visitorId, req);
			}

			next();
		} catch (err) {
			next(err);
		}
	};
};
