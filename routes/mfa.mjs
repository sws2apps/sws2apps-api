// dependencies
import express from 'express';
import Cryptr from 'cryptr';
import twofactor from 'node-2fa';
import { body, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

// middleware import
import { sessionChecker } from '../middleware/session-checker.mjs';

// get firestore
const db = getFirestore(); //get default database

const router = express.Router();

router.use(sessionChecker());

// 2fa setup
router.post('/enable-two-factor-auth', async (req, res, next) => {
	try {
		const { email } = req.body;

		const userRef = db.collection('users').doc(email);
		const userSnap = await userRef.get();

		const secret = speakeasy.generateSecret();

		const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
		const cryptr = new Cryptr(myKey);
		const encryptedData = cryptr.encrypt(JSON.stringify(secret));

		const data = {
			about: { ...userSnap.data().about, secret: encryptedData },
		};

		await db.collection('users').doc(email).set(data);

		res.locals.type = 'info';
		res.locals.message = '2fa enabled for the user';
		res.status(200).json({ message: secret.base32 });
	} catch (err) {
		next(err);
	}
});

// 2fa check
router.post(
	'/verify-token',
	body('token').isNumeric().isLength({ min: 6 }),
	async (req, res, next) => {
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
		const { email } = res.locals.currentUser;

		try {
			// Retrieve user from database
			const userRef = db.collection('users').doc(email);
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
				const { session_id } = req.headers;

				let sessions = userSnap.data().about.sessions || [];
				let itemCn = sessions.find((session) => session.id === session_id);
				itemCn.mfaVerified = true;

				let newSessions = sessions.filter(
					(session) => session.id !== session_id
				);
				newSessions.push(itemCn);

				const data = {
					about: {
						...userSnap.data().about,
						mfaEnabled: true,
						sessions: newSessions,
					},
				};
				await db.collection('users').doc(email).set(data, { merge: true });

				res.locals.type = 'info';
				res.locals.message = 'OTP token verification success';

				res.status(200).json({ message: 'TOKEN_VALID' });
			} else {
				res.locals.type = 'warn';
				res.locals.message = `OTP token invalid`;

				res.status(403).json({ message: 'TOKEN_INVALID' });
			}
		} catch (err) {
			next(err);
		}
	}
);

export default router;
