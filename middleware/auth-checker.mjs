import { getAuth } from 'firebase-admin/auth';

export const authChecker = () => {
	return async (req, res, next) => {
		try {
			const validPaths = [
				'/get-backup',
				'/send-backup',
				'/generate-id',
				'/create-account',
				'/signin',
				'/change-password',
			];

			if (validPaths.findIndex((path) => path === req.path) >= 0) {
				const uid = req.headers.uid;
				if (uid) {
					getAuth()
						.getUser(uid)
						.then(() => {
							next();
						})
						.catch((err) => {
							next(err);
						});
				} else {
					res.locals.type = 'warn';
					res.locals.message = 'access denied: missing uid in request headers';
					res.locals.failedLoginAttempt = true;
					res.status(403).json({ message: 'FORBIDDEN' });
				}
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
