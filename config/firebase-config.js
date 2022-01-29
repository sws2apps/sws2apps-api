const admin = require('firebase-admin');
require('dotenv').config();

// load utils
const logger = require('../utils/logger');

const firebaseAppProd = () => {
	const serviceAccount = JSON.parse(
		Buffer.from(process.env.GOOGLE_CONFIG_BASE64, 'base64').toString('ascii')
	);

	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});

	logger(undefined, 'info', 'firebase will be running in production mode');
};

const firebaseAppDev = () => {
	admin.initializeApp({
		projectId: 'sws-apps-dev',
	});

	logger(undefined, 'info', 'firebase will be running in development mode');
};

module.exports.FirebaseApp = process.env.FIREBASE_AUTH_EMULATOR_HOST
	? firebaseAppDev()
	: firebaseAppProd();
