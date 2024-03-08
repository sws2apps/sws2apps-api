import cors from 'cors';
import express from 'express';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import requestIp from 'request-ip';

import './config/crowdin-config.js';
import './config/firebase-config.js';
import './config/i18n-config.js';

import authRoute from './routes/auth.js';
import congregationRoute from './routes/congregation.js';
import congregationAdminRoute from './routes/congregation-admin.js';
import congregationMeetingEditorRoute from './routes/congregation-meeting-editor.js';
import congregationSecretaryRoute from './routes/congregation-secretary.js';
import userRoute from './routes/users.js';
import adminRoute from './routes/admin.js';
import mfaRoute from './routes/mfa.js';
import swsPocketRoute from './routes/sws-pocket.js';
import publicRoute from './routes/public.js';

import { internetChecker } from './middleware/internet-checker.js';
import { requestChecker } from './middleware/request-checker.js';
import { updateTracker } from './middleware/update-tracker.js';
import { appVersionChecker } from './middleware/app-version-checker.js';
import { serverReadyChecker } from './middleware/server-ready-checker.js';

import { errorHandler, getAppVersion, getRoot, invalidEndpointHandler } from './controllers/app-controller.js';

// allowed apps url
const whitelist = [
	'https://cpe-web.sws2apps.com',
	'https://admin.sws2apps.com',
	'https://cpe-sws.web.app',
	'https://cpe-sws.firebaseapp.com',
	'https://sws2apps-tools.web.app',
	'https://sws2apps-tools.firebaseapp.com',
];

const allowedUri = ['/app-version', '/api/public/source-material'];

const corsOptionsDelegate = function (req, callback) {
	var corsOptions;

	if (process.env.NODE_ENV === 'production') {
		const reqOrigin = req.header('Origin');
		if (reqOrigin) {
			if (whitelist.indexOf(reqOrigin) !== -1) {
				corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
			} else {
				const originalUri = req.headers['x-original-uri'];

				if (originalUri === '/') {
					corsOptions = { origin: true }; // allow CORS for index route
				} else {
					const allowed = allowedUri.find((uri) => uri.startsWith(originalUri)) ? true : false;
					corsOptions = { origin: allowed };
				}
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

app.set('trust proxy', 1);

app.use(helmet());

const __dirname = path.resolve();
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors(corsOptionsDelegate));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

app.use(requestIp.mw()); // get IP address middleware
app.use(internetChecker());
app.use(requestChecker());
app.use(updateTracker());
app.use(serverReadyChecker());

app.use(
	rateLimit({
		windowMs: 1000,
		max: 20,
		message: JSON.stringify({
			message: 'TOO_MANY_REQUESTS',
		}),
	})
);

app.use('/api/public', publicRoute);
app.get('/app-version', getAppVersion);
app.get('/', getRoot);

app.use(appVersionChecker());
app.use('/', authRoute);
app.use('/api/sws-pocket', swsPocketRoute);
app.use('/api/mfa', mfaRoute);
app.use('/api/users', userRoute);
app.use('/api/congregations', congregationRoute);
app.use('/api/congregations/meeting', congregationMeetingEditorRoute);
app.use('/api/congregations/secretary', congregationSecretaryRoute);
app.use('/api/congregations/admin', congregationAdminRoute);
app.use('/api/admin', adminRoute);

// Handling invalid routes
app.use(invalidEndpointHandler);

// Handling error for all requests
app.use(errorHandler);

export default app;
