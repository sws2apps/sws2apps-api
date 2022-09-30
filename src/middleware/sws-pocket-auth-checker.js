// dependencies
import { check, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

// utilities
import { findPocketByVisitorID } from '../utils/sws-pocket-utils.js';

// get firestore
const db = getFirestore();

export const pocketAuthChecker = () => {
	return async (req, res, next) => {
		try {
			await check('visitorid').notEmpty().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const { visitorid } = req.headers;

			const user = await findPocketByVisitorID(visitorid);

			// found user or it is a sign up request
			if (user || req.path === '/signup') {
				res.locals.currentUser = user;

				// update last connection for found user
				if (user) {
					const { id, pocket_devices } = user;
					const foundDevice = pocket_devices.find(
						(device) => device.visitorid === visitorid
					);
					const filteredDevices = pocket_devices.filter(
						(device) => device.visitorid !== visitorid
					);

					const updatedDevices = [
						{
							visitorid,
							name: foundDevice.name,
							sws_last_seen: new Date().getTime(),
						},
						...filteredDevices,
					];

					await db
						.collection('users')
						.doc(id)
						.update({ 'congregation.devices': updatedDevices });
				}

				next();

				return;
			}

			res.locals.type = 'warn';
			res.locals.message =
				'the visitor id is not associated yet to any congregation';

			res.status(403).json({ message: 'SETUP_FIRST' });
		} catch (err) {
			next(err);
		}
	};
};
