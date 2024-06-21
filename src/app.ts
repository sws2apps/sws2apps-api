import cors, { CorsOptions } from 'cors';
import express, { Request } from 'express';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import requestIp from 'request-ip';
import cookieParser from 'cookie-parser';

import './config/firebase_config.js';

import authRoute from './routes/auth.js';
import congregationRoute from './routes/congregation.js';
import congregationMeetingEditorRoute from './routes/congregation_meeting_editor.js';
import congregationAdminRoute from './routes/congregation_admin.js';
import userRoute from './routes/users.js';
import mfaRoute from './routes/mfa.js';
import publicRoute from './routes/public.js';

import { internetChecker } from './middleware/internet_checker.js';
import { requestChecker } from './middleware/request_checker.js';
import { updateTracker } from './middleware/update_tracker.js';
import { appVersionChecker } from './middleware/app_version_checker.js';
import { serverReadyChecker } from './middleware/server_ready_checker.js';

import { errorHandler, getRoot, invalidEndpointHandler } from './controllers/app_controller.js';

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

const corsOptionsDelegate = function (req: Request, callback: (_: null, options: CorsOptions) => void) {
	const corsOptions: CorsOptions = { origin: true, credentials: true };

	if (process.env.NODE_ENV === 'production') {
		const reqOrigin = req.header('Origin');
		if (reqOrigin) {
			if (whitelist.indexOf(reqOrigin) === -1) {
				const originalUri = req.headers['x-original-uri'] as string;

				if (originalUri !== '/') {
					const allowed = allowedUri.find((uri) => uri.startsWith(originalUri)) ? true : false;
					corsOptions.origin = allowed;
				}
			}
		} else {
			corsOptions.origin = false;
		}
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

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});

app.use(cookieParser(process.env.SEC_ENCRYPT_KEY || 'DON’T_FORGET_TO_SET_KEY_IN_PROD'));

app.use(requestIp.mw()); // get IP address middleware
app.use(internetChecker());
app.use(requestChecker());
app.use(updateTracker());
app.use(serverReadyChecker());

app.use(
	rateLimit({
		windowMs: 1000,
		max: 20,
		message: JSON.stringify({ message: 'TOO_MANY_REQUESTS' }),
	})
);

app.get('/', getRoot);
app.use('/api/public', publicRoute);

app.use(appVersionChecker());
app.use('/', authRoute);
app.use('/api/mfa', mfaRoute);
app.use('/api/users', userRoute);
app.use('/api/congregations', congregationRoute);
app.use('/api/congregations/meeting', congregationMeetingEditorRoute);
app.use('/api/congregations/admin', congregationAdminRoute);

// Handling invalid routes
app.use(invalidEndpointHandler);

// Handling error for all requests
app.use(errorHandler);

export default app;