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
import type { RequestHandler } from 'express';

import { requireInternetConnection } from '#http/middleware/internet-connection.middleware.js';
import { trackRequestState } from '#http/middleware/request-state.middleware.js';
import { logRequestCompletion } from '#http/middleware/request-logging.middleware.js';
import { serverReadyChecker } from '#http/middleware/server-ready.middleware.js';

import apiV3Routes from '#http/api-v3.routes.js';

import { errorHandler, getRoot, invalidEndpointHandler } from '#http/app.controller.js';
import resources from '#platform/localization/resources.js';
import { env } from '#config/env.js';
import { serverConfig } from '#config/server.js';
import { createCorsOptions } from '#http/security/cors.js';

const corsOptionsDelegate = (request: express.Request, callback: (_error: null, options: CorsOptions) => void) => {
	callback(null, createCorsOptions(request, env.isProduction));
};

type ApplicationMiddlewareOverrides = {
	internetConnection?: RequestHandler;
	requestState?: RequestHandler;
	requestLogging?: RequestHandler;
	serverReady?: RequestHandler;
};

export const createApp = (middlewareOverrides: ApplicationMiddlewareOverrides = {}) => {
	const app = express();

	app.set('trust proxy', 1);

	app.use(helmet());

	app.use(express.static('public'));

	const applicationRoot = path.resolve();

	app.use(favicon(path.join(applicationRoot, 'public', 'favicon.ico')));

	app.use(cors(corsOptionsDelegate));

	app.use(compression());
	app.use(requestIp.mw()); // get IP address middleware
	app.use(rateLimit({
		windowMs: serverConfig.rateLimit.windowMilliseconds,
		max: serverConfig.rateLimit.maximumRequestsPerWindow,
		message: { message: 'TOO_MANY_REQUESTS' },
		standardHeaders: 'draft-8',
		legacyHeaders: false,
	}));

	app.use(express.json({ limit: serverConfig.requestBodySizeLimit }));
	app.use(express.urlencoded({
		limit: serverConfig.requestBodySizeLimit,
		extended: true,
	}));

	app.use(middlewareOverrides.internetConnection ?? requireInternetConnection());
	app.use(middlewareOverrides.requestState ?? trackRequestState());
	app.use(middlewareOverrides.requestLogging ?? logRequestCompletion());
	app.use(middlewareOverrides.serverReady ?? serverReadyChecker());

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

	return app;
};

const app = createApp();

export default app;
