import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore();

export const adminAuthChecker = () => {
	return async (req, res, next) => {
		try {
			const session_id = req.headers.session_id;

			if (session_id.length <= 0) {
				res.locals.type = 'warn';
				res.locals.message =
					'the session id is missing from the request headers';

				res.status(403).json({ message: 'LOGIN_FIRST' });

				return;
			}

			// check if session is authenticated for an administrator
			if (res.locals.currentUser.about.role === 'admin') {
				next();
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'you are not an administrator';
				res.locals.failedLoginAttempt = true;
				res.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
			}
		} catch (err) {
			next(err);
		}
	};
};
