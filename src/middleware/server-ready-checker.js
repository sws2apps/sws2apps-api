export const serverReadyChecker = () => {
	return async (req, res, next) => {
		if (global.isServerReady === true) {
			next();
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the server is not yet ready. try again later';
			res.status(500).json({ message: 'SERVER_NOT_READY' });
		}
	};
};
