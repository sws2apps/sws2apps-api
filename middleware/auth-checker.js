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
					res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
				});
		} else {
			res.status(403).send(JSON.stringify({ message: 'FORBIDDEN' }));
		}
	};
};
