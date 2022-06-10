// dependencies
import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';

// utils
import {
	findCongregationRequestById,
	getCongregationInfo,
	getCongregations,
	getCongregationsRequests,
} from '../utils/congregation-utils.js';
import { sendCongregationAccountCreated } from '../utils/sendEmail.js';

// get firestore
const db = getFirestore();

const router = express.Router();

router.get('/', async (req, res, next) => {
	try {
		const congsList = await getCongregations();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched all congregation';
		res.status(200).json(congsList);
	} catch (err) {
		next(err);
	}
});

router.get('/requests', async (req, res, next) => {
	try {
		const finalResult = await getCongregationsRequests();

		res.locals.type = 'info';
		res.locals.message = 'admin fetched pending requests';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
});

router.put('/:id/approve', async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const request = await findCongregationRequestById(id);
			if (request) {
				if (request.approved) {
					res.locals.type = 'warn';
					res.locals.message = 'this congregation request was already approved';
					res.status(405).json({ message: 'REQUEST_APPROVED' });
				} else {
					// create congregation data
					const congData = {
						cong_name: request.cong_name,
						cong_number: request.cong_number,
					};
					const cong = await db.collection('congregation_data').add(congData);

					// update requestor info
					const userData = {
						congregation: { id: cong.id, role: request.cong_role },
					};
					await db
						.collection('users')
						.doc(request.user_id)
						.set(userData, { merge: true });

					// update request props
					const requestData = {
						approved: true,
					};
					await db
						.collection('congregation_request')
						.doc(id)
						.set(requestData, { merge: true });

					// send email to user
					sendCongregationAccountCreated(
						request.email,
						request.username,
						request.cong_name,
						request.cong_number
					);

					res.locals.type = 'info';
					res.locals.message = 'congregation created';
					res.status(200).json({ message: 'OK' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message =
					'no congregation request could not be found with the provided id';
				res.status(404).json({ message: 'REQUEST_NOT_FOUND' });
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;

		if (id) {
			const cong = await getCongregationInfo(id);
			if (cong) {
				if (cong.cong_members.length > 0) {
					res.locals.type = 'warn';
					res.locals.message =
						'congregation could not be deleted since there are still users inside';
					res.status(405).json({ message: 'CONG_ACTIVE' });
				} else {
					// remove from firestore
					await db.collection('congregation_data').doc(id).delete();

					res.locals.type = 'info';
					res.locals.message = 'congregation deleted';
					res.status(200).json({ message: 'OK' });
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message =
					'no congregation could not be found with the provided id';
				res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			}
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		}
	} catch (err) {
		next(err);
	}
});

export default router;
