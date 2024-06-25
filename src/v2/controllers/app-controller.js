const APP_VERSION = process.env.npm_package_version;

export const getRoot = async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'success opening main route';
		res.status(200).json({ message: `SWS Apps API services v${APP_VERSION}` });
	} catch (err) {
		next(err);
	}
};

export const getAppVersion = async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'json output for shields.io generated';
		res.status(200).json({
			schemaVersion: 1,
			label: 'version',
			message: APP_VERSION,
			color: 'blue',
		});
	} catch (err) {
		next(err);
	}
};

export const invalidEndpointHandler = async (req, res) => {
	res.locals.type = 'warn';
	res.locals.message = 'invalid endpoint';
	res.status(404).json({ message: 'INVALID_ENDPOINT' });
};

export const errorHandler = (error, req, res, next) => {
	res.locals.type = 'warn';
	res.locals.message = `an error occured: ${error.stack || error}`;
	console.log(`an error occured: ${error.stack || error}`)
	if (error.errorInfo?.code === 'auth/email-already-exists') {
		res.status(403).json({
			message: 'USER_NOT_FOUND',
		});
	} else if (error.errorInfo?.code === 'auth/user-not-found') {
		res.status(403).json({
			message: 'USER_NOT_FOUND',
		});
	} else {
		res.status(500).json({ message: 'INTERNAL_ERROR' });
	}
};
