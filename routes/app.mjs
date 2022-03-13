// dependency import
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import favicon from 'serve-favicon';
import path from 'node:path';
import requestIp from 'request-ip';

// firebase admin import
import '../config/firebase-config.mjs';

// route import
import congregationRoute from './congregation.mjs';
import swsPocketRoute from './sws-pocket.mjs';
import userRoute from './user.mjs';
import adminRoute from './admin.mjs';

// middleware import
import { internetChecker } from '../middleware/internet-checker.mjs';
import { requestChecker } from '../middleware/request-checker.mjs';
import { updateTracker } from '../middleware/update-tracker.mjs';

// load utils
import { appVersion } from '../utils/server.mjs';

// allowed apps url
var whitelist = [
	'https://sws-pocket.web.app',
	'https://sws-pocket.firebaseapp.com',
	'https://lmm-oa-sws.web.app',
	'https://lmm-oa-sws.firebaseapp.com',
	'https://dev-lmm-oa-sws.web.app',
	'https://dev-lmm-oa-sws.firebaseapp.com',
	'https://sws-apps-dev.web.app',
	'https://sws-apps-dev.firebaseapp.com',
	'https://staging-lmm-oa-sws.web.app',
	'https://staging-lmm-oa-sws.firebaseapp.com',
];

var corsOptionsDelegate = function (req, callback) {
	var corsOptions;
	if (process.env.NODE_ENV === 'production') {
		const reqOrigin = req.header('Origin');
		if (reqOrigin) {
			if (whitelist.indexOf(reqOrigin) !== -1) {
				corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
			} else {
				corsOptions = { origin: false }; // disable CORS for this request
			}
		} else {
			corsOptions = { origin: false };
		}
	} else {
		corsOptions = { origin: true }; // allow cors during dev
	}

	callback(null, corsOptions); // callback expects two parameters: error and options
};

const app = express();

app.disable('x-powered-by');

const __dirname = path.resolve();
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors(corsOptionsDelegate));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

global.requestTracker = [];

app.use(requestIp.mw()); // get IP address middleware
app.use(internetChecker());
app.use(requestChecker());
app.use(updateTracker());

app.use(
	rateLimit({
		windowMs: 1000,
		max: 20,
		message: JSON.stringify({
			message: 'TOO_MANY_REQUESTS',
		}),
	})
);

app.use('/api/congregation', congregationRoute);
app.use('/api/sws-pocket', swsPocketRoute);
app.use('/api/user', userRoute);
app.use('/api/admin', adminRoute);

app.get('/', async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'success opening main route';
		res.send(`SWS Apps API services v${appVersion}`);
	} catch (err) {
		next(err);
	}
});

app.get('/app-version', async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'json output for shields.io generated';
		res.status(200).json({
			schemaVersion: 1,
			label: 'version',
			message: appVersion,
			color: 'blue',
		});
	} catch (err) {
		next(err);
	}
});

// Handling invalid routes
app.use((req, res) => {
	res.locals.type = 'warn';
	res.locals.message = 'invalid endpoint';
	res.status(404).json({ message: 'INVALID_ENDPOINT' });
});

// Handling error for all requests
app.use((error, req, res, next) => {
	res.locals.type = 'warn';
	res.locals.message = `an error occured: ${error.stack || error}`;
	if (error.errorInfo?.code === 'auth/email-already-exists') {
		res.status(403).json({
			message: 'ACCOUNT_IN_USE',
		});
	} else if (error.errorInfo?.code === 'auth/user-not-found') {
		res.status(403).json({
			message: 'USER_NOT_FOUND',
		});
	} else {
		console.log(error);
		res.status(500).json({ message: 'INTERNAL_ERROR' });
	}
});

export default app;
