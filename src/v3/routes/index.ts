import express from 'express';
import cookieParser from 'cookie-parser';

import authRoute from '../../modules/auth/auth.routes.js';
import congregationRoute from '../../modules/congregations/congregations.routes.js';
import congregationMeetingEditorRoute from '../../modules/meetings/meetings.routes.js';
import congregationAdminRoute from './congregation_admin.js';
import userRoute from './users.js';
import mfaRoute from '../../modules/mfa/mfa.routes.js';
import publicRoute from '../../modules/public-api/public.routes.js';
import pocketRoute from '../../modules/pockets/pockets.routes.js';
import adminRoute from './admin.js';

import { clientVersionChecker } from '../../http/middleware/client-version.middleware.js';
import { env } from '../../config/env.js';

const router = express.Router();

router.use(cookieParser(env.encryptionKey));

router.use('/public', publicRoute);

router.use(clientVersionChecker());

router.use('/', authRoute);
router.use('/pockets', pocketRoute);
router.use('/mfa', mfaRoute);
router.use('/users', userRoute);
router.use('/congregations', congregationRoute);
router.use('/congregations/meeting', congregationMeetingEditorRoute);
router.use('/congregations/admin', congregationAdminRoute);
router.use('/admin', adminRoute);

export default router;
