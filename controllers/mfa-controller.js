// dependencies
import Cryptr from 'cryptr';
import twofactor from 'node-2fa';
import { validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

export const verifyToken = async (req, res, next) => {
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

	const { token } = req.body;

	const { id, sessions, username, cong_name, cong_number, cong_role, cong_id } =
		res.locals.currentUser;

	try {
		// Retrieve user from database
		const userRef = db.collection('users').doc(id);
		const userSnap = await userRef.get();

		// get encrypted token
		const encryptedData = userSnap.data().about.secret;

		// decrypt token
		const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
		const cryptr = new Cryptr(myKey);
		const decryptedData = cryptr.decrypt(encryptedData);

		// get secret
		const { secret } = JSON.parse(decryptedData);

		// 2fa verification
		const verified = twofactor.verifyToken(secret, token);

		if (verified?.delta === 0) {
			// update mfa enabled && verified
			const { visitor_id } = req.headers;

			let newSessions = sessions.map((session) => {
				if (session.visitor_id === visitor_id) {
					return {
						...session,
						mfaVerified: true,
						sws_last_seen: new Date().getTime(),
					};
				} else {
					return session;
				}
			});

			const data = {
				about: {
					...userSnap.data().about,
					mfaEnabled: true,
					sessions: newSessions,
				},
			};
			await db.collection('users').doc(id).set(data, { merge: true });

			// init response object
			let obj = {};
			obj.message = 'TOKEN_VALID';
			obj.id = id;
			obj.username = username;
			obj.cong_name = cong_name;
			obj.cong_number = cong_number;
			obj.cong_role = cong_role;
			obj.cong_id = cong_id;

			res.locals.type = 'info';
			res.locals.message = 'OTP token verification success';

			res.status(200).json(obj);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'OTP token invalid';

			res.status(403).json({ message: 'TOKEN_INVALID' });
		}
	} catch (err) {
		next(err);
	}
};
