import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { check, validationResult } from 'express-validator';

// utils
import {
	deleteAnnouncement,
	getAnnouncement,
	getAnnouncements,
	publishAnnouncement,
	saveDraftAnnouncement,
} from '../utils/announcement-utils.js';
import {
	getCongregations,
	getCongregationInfo,
} from '../utils/congregation-utils.js';
import { getUserInfo, getUsers } from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

export const validateAdmin = async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged in';

		res.status(200).json({ message: 'OK' });
	} catch (err) {
		next(err);
	}
};

export const logoutAdmin = async (req, res, next) => {
	try {
		// remove all sessions
		const { id } = res.locals.currentUser;

		const userRef = db.collection('users').doc(id);
		const userSnap = await userRef.get();

		const aboutUser = userSnap.data().about;

		const data = {
			about: { ...aboutUser, sessions: [] },
		};

		await db.collection('users').doc(id).set(data, { merge: true });

		res.locals.type = 'info';
		res.locals.message = 'administrator successfully logged out';
		res.status(200).json({ message: 'LOGGED_OUT' });
	} catch (err) {
		next(err);
	}
};

export const getBlockedRequests = async (req, res, next) => {
	try {
		let reqs = [];
		for (let i = 0; i < requestTracker.length; i++) {
			const retryOn = requestTracker[i].retryOn || 0;
			if (retryOn > 0) {
				const currentDate = new Date().getTime();
				if (currentDate < retryOn) {
					reqs.push(requestTracker[i]);
				}
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'admin fetched blocked requests';
		res.status(200).json({ message: reqs });
	} catch (err) {
		next(err);
	}
};

export const unblockRequest = async (req, res, next) => {
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

		const ipIndex = requestTracker.findIndex(
			(client) => client.ip === req.body.request_ip
		);

		if (ipIndex === -1) {
			res.locals.type = 'warn';
			res.locals.message = 'failed to unblock request since ip is not valid';
			res.status(400).json({ message: 'UNBLOCK_FAILED' });
		} else {
			requestTracker.splice(ipIndex, 1);
			res.locals.type = 'info';
			res.locals.message = 'request unblocked successfully';
			res.status(200).json({ message: requestTracker });
		}
	} catch (err) {
		next(err);
	}
};

export const getAllAnnouncements = async (req, res, next) => {
	try {
		const announcements = await getAnnouncements();

		res.locals.type = 'info';
		res.locals.message = 'announcements fetched successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
};

export const saveAnnouncementDraft = async (req, res, next) => {
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

		const { announcement } = req.body;
		const announcements = await saveDraftAnnouncement(announcement);

		res.locals.type = 'info';
		res.locals.message = 'draft announcement saved successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
};

export const getAnnouncementAdmin = async (req, res, next) => {
	try {
		await check('announcement_id').notEmpty().run(req);

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

		const { announcement_id } = req.headers;
		const announcement = await getAnnouncement(announcement_id);

		if (announcement) {
			res.locals.type = 'info';
			res.locals.message = 'announcement fetched successfully';
			res.status(200).json(announcement);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'announcement could not be found';
			res.status(404).json({ message: 'NOT_FOUND' });
		}
	} catch (err) {
		next(err);
	}
};

export const deleteAnnouncementAdmin = async (req, res, next) => {
	try {
		await check('announcement_id').notEmpty().run(req);

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

		const { announcement_id } = req.headers;
		const announcements = await deleteAnnouncement(announcement_id);

		res.locals.type = 'info';
		res.locals.message = 'announcement deleted successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
};

export const publishAnnouncementAdmin = async (req, res, next) => {
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

		const { announcement } = req.body;
		const announcements = await publishAnnouncement(announcement);

		res.locals.type = 'info';
		res.locals.message = 'announcement published successfully';
		res.status(200).json(announcements);
	} catch (err) {
		next(err);
	}
};
