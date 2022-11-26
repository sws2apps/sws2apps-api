// dependencies
import { validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';
import {
	FingerprintJsServerApiClient,
	Region,
} from '@fingerprintjs/fingerprintjs-pro-server-api';

// classes
import { Users } from '../classes/Users.js';
import { Congregations } from '../classes/Congregations.js';

// get firestore
const db = getFirestore();

export const validatePocket = async (req, res, next) => {
	try {
		const {
			username,
			pocket_local_id,
			pocket_members,
			cong_name,
			cong_number,
		} = res.locals.currentUser;

		res.locals.type = 'info';
		res.locals.message = 'visitor id has been validated';
		res.status(200).json({
			username,
			pocket_local_id,
			pocket_members,
			cong_name,
			cong_number,
		});
	} catch (err) {
		next(err);
	}
};

export const pocketSignUp = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		// get visitor ID and otp code
		const { otp_code, visitorid } = req.body;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitorid, {
			limit: 1,
		});

		if (visitorHistory.visits?.length > 0) {
			const user = await findUserByOTPCode(otp_code);

			if (user) {
				// add visitor id and remove otp_code
				let devices = user.pocket_devices || [];
				const visit = visitorHistory.visits[0]
				const obj = {
					visitorid: visitorid,
					name: `${visit.browserDetails.os} ${visit.browserDetails.osVersion} (${visit.browserDetails.browserName} ${visit.browserDetails.browserFullVersion})`,
					sws_last_seen: new Date().getTime(),
				};

				const foundDevice = devices.find(
					(device) => device.visitorid === visitorid
				);

				const user = await Users.findUserByOTPCode(otp_code);

				if (user) {
					// add visitor id and remove otp_code
					let devices = user.pocket_devices;

					// add new device
					devices.push(obj);

					await db.collection('users').doc(user.id).update({
						'congregation.oCode': FieldValue.delete(),
						'congregation.devices': devices,
					});

					const {
						username,
						pocket_local_id,
						pocket_members,
						cong_name,
						cong_number,
					} = await findPocketByVisitorID(visitorid);

					res.locals.type = 'info';
					res.locals.message = 'pocket device visitor id added successfully';
					res.status(200).json({
						username,
						pocket_local_id,
						pocket_members,
						cong_name,
						cong_number,
					});
					return;
				}

				// add new device
				devices.push(obj);

				const {
					username,
					pocket_local_id,
					pocket_members,
					cong_name,
					cong_number,
				} = await user.updatePocketDevices(devices);

				res.locals.type = 'info';
				res.locals.message = 'pocket device visitor id added successfully';
				res.status(200).json({
					username,
					pocket_local_id,
					pocket_members,
					cong_name,
					cong_number,
				});
				return;
			}

			// pocket code not found
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the pocket could not be found';
			res.status(403).json({ message: 'POCKET_NOT_FOUND' });
		} else {
			// visitor id not found
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the authentication request seems to be fraudulent';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		}
	} catch (err) {
		next(err);
	};

	export const getSchedule = async (req, res, next) => {
		try {
			const { cong_id } = res.locals.currentUser;

			const { cong_sourceMaterial, cong_schedule } =
				Congregations.findCongregationById(cong_id);

			res.locals.type = 'info';
			res.locals.message = 'pocket user has fetched the schedule';
			res.status(200).json({ cong_sourceMaterial, cong_schedule });
		} catch (err) {
			next(err);
		}
	};
