const { getAuth } = require('firebase-admin/auth');

module.exports = () => {
	return async (req, res, next) => {
		const uid = req.headers.uid;
		if (uid) {
			getAuth()
				.getUser(uid)
				.then(() => {
					next();
				})
				.catch(() => {
					res.locals.failedLoginAttempt = true;
					res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
				});
		} else {
			res.locals.failedLoginAttempt = true;
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	};
};
