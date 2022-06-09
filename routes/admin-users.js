// dependencies
import express from 'express';

// utils
import { getUsers } from '../utils/user-utils.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const users = await getUsers();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all users';
		res.status(200).json(users);
	} catch (err) {
		next(err);
	}
});

router.delete('/:id', async (req, res, next) => {
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

		if (req.body.user_type !== 'pocket' && req.body.user_type !== 'vip') {
			res.locals.type = 'warn';
			res.locals.message = 'invalid user type';

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		if (req.body.user_type === 'pocket') {
			await db.collection('users').doc(req.body.user_uid).delete();

			res.locals.type = 'info';
			res.locals.message = 'sucessfully deleted user';
			res.status(200).json({ message: 'OK' });
		} else {
			getAuth()
				.deleteUser(req.body.user_uid)
				.then(async () => {
					await db.collection('users').doc(req.body.user_uid).delete();

					res.locals.type = 'info';
					res.locals.message = 'sucessfully deleted user';
					res.status(200).json({ message: 'OK' });
				})
				.catch((error) => {
					res.locals.type = 'warn';
					res.locals.message = `error deleting user: ${error}`;
					res.status(400).json({ message: error });
				});
		}
	} catch (err) {
		next(err);
	}
});

export default router;
