import cors, { CorsOptions } from 'cors';
import express from 'express';
import { handle } from 'i18next-http-middleware';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import requestIp from 'request-ip';
import compression from 'compression';
import i18next from 'i18next';

import './platform/firebase/firebase-app.js';

import { requireInternetConnection } from './http/middleware/internet-connection.middleware.js';
import { trackRequestState } from './http/middleware/request-state.middleware.js';
import { logRequestCompletion } from './http/middleware/request-logging.middleware.js';
import { serverReadyChecker } from './http/middleware/server-ready.middleware.js';

import apiV3Routes from './http/api-v3.routes.js';

import { errorHandler, getRoot, invalidEndpointHandler } from './http/app.controller.js';
import resources from './v3/config/i18n_config.js';
import { env } from './config/env.js';
import { createCorsOptions } from './http/security/cors.js';

const corsOptionsDelegate = (request: express.Request, callback: (_error: null, options: CorsOptions) => void) => {
	callback(null, createCorsOptions(request, env.isProduction));
};

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

app.use(express.static('public'));

const __dirname = path.resolve();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(cors(corsOptionsDelegate));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(requestIp.mw()); // get IP address middleware
app.use(requireInternetConnection());
app.use(trackRequestState());
app.use(logRequestCompletion());
app.use(serverReadyChecker());

app.use(rateLimit({ windowMs: 1000, max: 20, message: JSON.stringify({ message: 'TOO_MANY_REQUESTS' }) }));

i18next.init({
	preload: ['eng'],
	lng: 'eng',
	fallbackLng: 'eng',
	resources: resources,
});

app.use(handle(i18next));

app.get('/', getRoot);

// load routes
app.use('/api/v3', apiV3Routes);

// Handling invalid routes
app.use(invalidEndpointHandler);

// Handling error for all requests
app.use(errorHandler);

export default app;
