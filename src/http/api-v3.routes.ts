import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from '../modules/auth/auth.routes.js';
import congregationRoutes from '../modules/congregations/congregations.routes.js';
import meetingRoutes from '../modules/meetings/meetings.routes.js';
import congregationAdministrationRoutes from '../modules/congregation-administration/congregation-administration.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import mfaRoutes from '../modules/mfa/mfa.routes.js';
import publicApiRoutes from '../modules/public-api/public.routes.js';
import pocketRoutes from '../modules/pockets/pockets.routes.js';
import administrationRoutes from '../modules/administration/administration.routes.js';

import { clientVersionChecker } from './middleware/client-version.middleware.js';
import { requireTrustedBrowserOrigin } from './middleware/trusted-origin.middleware.js';
import { env } from '../config/env.js';

const apiV3Router = express.Router();

apiV3Router.use(cookieParser(env.encryptionKey));

// Public endpoints intentionally remain available to clients below the minimum app version.
apiV3Router.use('/public', publicApiRoutes);

// Public routes stay cross-origin; all session-capable browser routes require a trusted app origin.
apiV3Router.use(requireTrustedBrowserOrigin());

apiV3Router.use(clientVersionChecker());

apiV3Router.use('/', authRoutes);
apiV3Router.use('/pockets', pocketRoutes);
apiV3Router.use('/mfa', mfaRoutes);
apiV3Router.use('/users', userRoutes);
apiV3Router.use('/congregations', congregationRoutes);
apiV3Router.use('/congregations/meeting', meetingRoutes);
apiV3Router.use('/congregations/admin', congregationAdministrationRoutes);
apiV3Router.use('/admin', administrationRoutes);

export default apiV3Router;
