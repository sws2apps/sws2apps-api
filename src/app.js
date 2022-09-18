// dependency import
import cors from 'cors';
import express from 'express';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import requestIp from 'request-ip';

// firebase admin import
import './config/firebase-config.js';

// route import
import authRoute from './routes/auth.js';
import congregationRoute from './routes/congregation.js';
import userRoute from './routes/users.js';
import adminRoute from './routes/admin.js';
import mfaRoute from './routes/mfa.js';
import swsPocketRoute from './routes/sws-pocket.js';
import publicRoute from './routes/public.js';

// middleware import
import { internetChecker } from './middleware/internet-checker.js';
import { requestChecker } from './middleware/request-checker.js';
import { updateTracker } from './middleware/update-tracker.js';

// import controller
import {
	errorHandler,
	getAppVersion,
	getRoot,
	invalidEndpointHandler,
} from './controllers/app-controller.js';

// allowed apps url
var whitelist = [
	'https://alpha-sws-pocket.web.app',
	'https://alpha-sws-pocket.firebaseapp.com',
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

app.use(helmet());

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

app.use('/', authRoute);
app.use('/api/congregations', congregationRoute);
app.use('/api/mfa', mfaRoute);
app.use('/api/users', userRoute);
app.use('/api/admin', adminRoute);
app.use('/api/sws-pocket', swsPocketRoute);
app.use('/api/public', publicRoute);

app.get('/', getRoot);

// get app version for shields.io
app.get('/app-version', getAppVersion);

// Handling invalid routes
app.use(invalidEndpointHandler);

// Handling error for all requests
app.use(errorHandler);

export default app;
