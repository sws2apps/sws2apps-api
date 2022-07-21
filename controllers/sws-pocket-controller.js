// dependencies
import { validationResult } from 'express-validator';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
	FingerprintJsServerApiClient,
	Region,
} from '@fingerprintjs/fingerprintjs-pro-server-api';

// utilities
import {
	findPocketByVisitorID,
	findUserByOTPCode,
} from '../utils/sws-pocket-utils.js';
import { getCongregationInfo } from '../utils/congregation-utils.js';

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
		const { otp_code, visitor_id } = req.body;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitor_id, {
			limit: 1,
		});

		// visitor id not found
		if (visitorHistory.visits.length === 0) {
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'visitor id not found in fingerprint';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		// request does not meet requirements
		const visit = visitorHistory.visits[0];
		if (
			visit.browserDetails.botProbability !== 0 ||
			visit.confidence.score !== 1
		) {
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'bot probability or fraudulent request';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = await findUserByOTPCode(otp_code);

		if (user) {
			// add visitor id and remove otp_code
			let devices = user.pocket_devices || [];

			const foundDevice = devices.find((device) => device === visitor_id);

			// device already added
			if (foundDevice) {
				res.locals.type = 'warn';
				res.locals.message = 'pocket visitor id already exists';
				res.status(400).json({ message: 'DEVICE_EXISTS' });

				return;
			}

			// add new device
			devices.push(visitor_id);

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
			} = await findPocketByVisitorID(visitor_id);

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

		res.locals.type = 'warn';
		res.locals.message = 'pocket verification code is invalid';
		res.status(404).json({ message: 'OTP_CODE_INVALID' });
	} catch (err) {
		next(err);
	}
};

export const getSchedule = async (req, res, next) => {
	try {
		const { cong_id } = res.locals.currentUser;

		const { cong_sourceMaterial, cong_schedule } = await getCongregationInfo(
			cong_id
		);

		res.locals.type = 'info';
		res.locals.message = 'pocket user has fetched the schedule';
		res.status(200).json({ cong_sourceMaterial, cong_schedule });
	} catch (err) {
		next(err);
	}
};
