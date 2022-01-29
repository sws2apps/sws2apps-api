// dependency import

const express = require('express');
const cors = require('cors');
const limiter = require('express-rate-limit');
const favicon = require('serve-favicon');
const path = require('path');

// load utils
require('./config/firebase-config'); //load firebase admin
const { getServerVersion } = require('./utils/server');
const logger = require('./utils/logger');

const appVersion = getServerVersion();

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

// Middleware import
const requestChecker = require('./middleware/request-checker');
const updateTracker = require('./middleware/update-tracker');

// Route import
const congregationRoute = require('./routes/congregation');
const swsPocketRoute = require('./routes/sws-pocket');
const userRoute = require('./routes/user');

const app = express();

app.disable('x-powered-by');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors(corsOptionsDelegate));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(updateTracker());
app.use(requestChecker());

app.use(
	limiter({
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
	res.locals.type = 'warn';
	res.locals.message = 'invalid endpoint';
	res.set('Content-Type', 'text/plain');
	res.status(404).send(JSON.stringify({ message: 'INVALID_ENDPOINT' }));
});

app.listen(port, () => {
	logger(undefined, 'info', `server up and running (v${appVersion})`);
});
