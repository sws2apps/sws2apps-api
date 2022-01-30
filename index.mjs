// dependency import
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import favicon from 'serve-favicon';
import path from 'node:path';
import requestIp from 'request-ip';

// firebase admin import
import './config/firebase-config.mjs';

// route import
import congregationRoute from './routes/congregation.mjs';
import swsPocketRoute from './routes/sws-pocket.mjs';
import userRoute from './routes/user.mjs';

// middleware import
import { internetChecker } from './middleware/internet-checker.mjs';
import { requestChecker } from './middleware/request-checker.mjs';
import { updateTracker } from './middleware/update-tracker.mjs';

// load utils
import { appVersion } from './utils/server.mjs';
import { logger } from './utils/logger.mjs';

// allowed apps url
var whitelist = [
	'https://sws-pocket.web.app',
	'https://sws-pocket.firebaseapp.com',
	'https://lmm-oa-sws.web.app',
	'https://lmm-oa-sws.firebaseapp.com',
];

var corsOptionsDelegate = function (req, callback) {
	var corsOptions;
	if (process.env.NODE_ENV === 'production') {
		const reqOrigin = req.header('Origin');
		if (reqOrigin) {
			if (whitelist.indexOf(reqOrigin) !== -1) {
				corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
			} else {
				// allow alpha & beta release
				if (
					reqOrigin.startsWith('https://lmm-oa-sws--alpha') &&
					reqOrigin.endsWith('.web.app')
				) {
					corsOptions = { origin: true };
				} else if (
					reqOrigin.startsWith('https://lmm-oa-sws--beta') &&
					reqOrigin.endsWith('.web.app')
				) {
					corsOptions = { origin: true };
				} else if (
					reqOrigin.startsWith('https://sws-pocket--alpha') &&
					reqOrigin.endsWith('.web.app')
				) {
					corsOptions = { origin: true };
				} else if (
					reqOrigin.startsWith('https://sws-pocket--beta') &&
					reqOrigin.endsWith('.web.app')
				) {
					corsOptions = { origin: true };
				} else {
					corsOptions = { origin: false }; // disable CORS for this request
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

app.disable('x-powered-by');

const __dirname = path.resolve();
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors(corsOptionsDelegate));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(requestIp.mw()); // get IP address middleware
app.use(internetChecker());
app.use(updateTracker());
app.use(requestChecker());

app.use(
	rateLimit({
		windowMs: 1000,
		max: 1,
		message: JSON.stringify({
			message: 'TOO_MANY_REQUESTS',
		}),
	})
);

app.use('/api/congregation', congregationRoute);
app.use('/api/sws-pocket', swsPocketRoute);
app.use('/api/user', userRoute);

const port = process.env.PORT || 8000;

app.get('/', async (req, res) => {
	res.locals.type = 'info';
	res.locals.message = 'success opening main route';
	res.send(`SWS Apps API services v${appVersion}`);
});

// Handling invalid routes
app.use((req, res) => {
	res.locals.type = 'warning';
	res.locals.message = 'invalid endpoint';
	res.set('Content-Type', 'text/plain');
	res.status(404).send(JSON.stringify({ message: 'INVALID_ENDPOINT' }));
});

// Handling error
app.use((error, req, res, next) => {
	res.locals.type = 'warning';
	res.locals.message = `an error occured: ${error.stack}`;
	res.set('Content-Type', 'text/plain');
	res.status(404).send(JSON.stringify({ message: 'INTERNAL_ERROR' }));
});

app.listen(port, () => {
	logger('info', `server up and running (v${appVersion})`);
});
