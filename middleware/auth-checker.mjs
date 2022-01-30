import { getAuth } from 'firebase-admin/auth';

export const authChecker = () => {
	return async (req, res, next) => {
		const uid = req.headers.uid;
		if (uid) {
			getAuth()
				.getUser(uid)
				.then(() => {
					next();
				})
				.catch((err) => {
					res.locals.type = 'warn';
					res.locals.message = `an error occured: ${err.message}`;
					res.locals.failedLoginAttempt = true;
					res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
				});
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'access denied: missing uid in request headers';
			res.locals.failedLoginAttempt = true;
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	};
};
