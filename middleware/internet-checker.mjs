// this middleware serve as a bridge to make sure that we can connect to Google Services before we use them

//app dependencies
import dns from 'dns/promises';

export const internetChecker = () => {
	return async (req, res, next) => {
		dns
			.lookup('google.com')
			.then(() => {
				next();
			})
			.catch(() => {
				res.locals.type = 'warn';
				res.locals.message =
					'the server could not make request to the internet';
				res.status(500).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
			});
	};
};
