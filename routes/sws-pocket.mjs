// dependencies
import express from 'express';
import randomstring from 'randomstring';
import { getFirestore } from 'firebase-admin/firestore';
import { body, validationResult } from 'express-validator';

// middleware import
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.mjs';

// get firestore
const db = getFirestore();

// init express router
const router = express.Router();

// create pocket user
router.post(
	'/create-account',
	body('user_fullname').notEmpty(),
	async (req, res, next) => {
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

			// generate pocket ui
			let setUID = false;
			let uid;

			do {
				uid = randomstring.generate({
					length: 6,
					charset: 'alphanumeric',
					capitalization: 'uppercase',
				});

				const congRef = db.collection('users').doc(uid);
				const docSnap = await congRef.get();

				if (!docSnap.exists) {
					setUID = true;
				}
			} while (setUID === false);

			// generate verification key
			const verifyKey = randomstring.generate(10);

			// create pocket user
			const data = {
				about: {
					name: req.body.user_fullname,
					role: 'pocket',
					pocket_verified: false,
					verification_key: verifyKey,
				},
			};

			await db.collection('users').doc(uid).set(data);

			res.locals.type = 'info';
			res.locals.message = 'pocket account created successfully';
			res.status(200).json({ message: uid });
		} catch (err) {
			next(err);
		}
	}
);

// protected routes
router.use(pocketAuthChecker());

// Login route
router.get('/login', async (req, res) => {
	res.status(200).json({ message: 'USER_LOGGED' });
});

export default router;
