import geoip from 'geoip-lite';

export const requestChecker = () => {
	return async (req, res, next) => {
		try {
			const geo = geoip.lookup(req.clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const clientIp = req.clientIp;
			const reqTrackRef = global.requestTracker.find((client) => client.ip === clientIp);

			if (reqTrackRef) {
				const { retryOn, failedLoginAttempt } = reqTrackRef;

				const ipIndex = global.requestTracker.findIndex((client) => client.ip === clientIp);

				if (retryOn !== '') {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						res.locals.type = 'warn';
						res.locals.message = 'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
					} else {
						global.requestTracker.splice(ipIndex, 1);
						next();
					}
				} else {
					if (failedLoginAttempt === 3) {
						res.locals.type = 'warn';
						res.locals.message = 'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY' });

						res.on('finish', async () => {
							const currentD = new Date();
							const retryDate = currentD.getTime() + 15 * 60000;

							const ipIndex = global.requestTracker.findIndex((client) => client.ip === clientIp);

							global.requestTracker.splice(ipIndex, 1);

							let obj = {};
							obj.ip = clientIp;
							obj.city = reqCity;
							obj.reqInProgress = false;
							obj.failedLoginAttempt = 3;
							obj.retryOn = retryDate;

							global.requestTracker.push(obj);
						});
					} else {
						global.requestTracker.splice(ipIndex, 1);

						let obj = {};
						obj.ip = clientIp;
						obj.city = reqCity;
						obj.reqInProgress = true;
						obj.failedLoginAttempt = failedLoginAttempt;
						obj.retryOn = '';

						global.requestTracker.push(obj);
						next();
					}
				}
			} else {
				let obj = {};
				obj.ip = clientIp;
				obj.city = reqCity;
				obj.reqInProgress = true;
				obj.failedLoginAttempt = 0;
				obj.retryOn = '';
				global.requestTracker.push(obj);

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
