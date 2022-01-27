//app dependencies

const express = require('express');
const fetch = require('node-fetch');
const Cryptr = require('cryptr');
const { getFirestore } = require('firebase-admin/firestore');
const requestIp = require('request-ip');

require('../config/firebase-config'); //load firebase admin
const updateTracker = require('../utils/updateTracker'); //load utils
const db = getFirestore();

const router = express.Router();

// SWS Pocket OAuth Middleware

const oAuth = async (req, res, next) => {
	const congID = req.headers.cong_id;
	const congNum = req.headers.cong_num;
	const studentPIN = req.headers.user_pin;

	let statusCode;
	let statusMsg;

	if (congID && congNum & studentPIN) {
		const congRef = db.collection('congregation_data').doc(congID);
		const docSnap = await congRef.get();

		if (docSnap.exists) {
			const isValidNum = docSnap.data().congNumber === congNum;
			if (isValidNum) {
				const pocketUsers = docSnap.data().pocketUsers || [];
				const findIndex = pocketUsers.findIndex(
					(user) => user.PIN === +studentPIN
				);

				if (findIndex === -1) {
					statusCode = 403;
					statusMsg = 'FORBIDDEN';
				} else {
					statusCode = 200;
				}
			} else {
				statusCode = 403;
				statusMsg = 'FORBIDDEN';
			}
		} else {
			statusCode = 403;
			statusMsg = 'FORBIDDEN';
		}
	} else {
		statusCode = 400;
		statusMsg = 'MISSING_INFO';
	}

	const clientIp = requestIp.getClientIp(req);

	if (statusCode === 200) {
		await updateTracker(clientIp, {
			failedLoginAttempt: 0,
			retryOn: '',
		});
		next();
	} else if (statusCode === 403) {
		res.status(statusCode).send(JSON.stringify({ message: statusMsg }));
		res.on('finish', async () => {
			await updateTracker(clientIp, {
				reqInProgress: false,
				failedLoginAttempt: true,
			});
		});
	} else {
		res.status(statusCode).send(JSON.stringify({ message: statusMsg }));
		res.on('finish', async () => {
			await updateTracker(clientIp, { reqInProgress: false });
		});
	}
};

// Login route
router.get('/login', oAuth, async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});
});

// Get schedules
router.get('/schedules', oAuth, async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
	res.on('finish', async () => {
		const clientIp = requestIp.getClientIp(req);
		await updateTracker(clientIp, { reqInProgress: false });
	});
});

module.exports = router;
