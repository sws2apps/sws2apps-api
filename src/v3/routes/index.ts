import express from 'express';
import cookieParser from 'cookie-parser';

import authRoute from './auth.js';
import congregationRoute from './congregation.js';
import congregationMeetingEditorRoute from './congregation_meeting_editor.js';
import congregationAdminRoute from './congregation_admin.js';
import userRoute from './users.js';
import mfaRoute from './mfa.js';
import publicRoute from '../../modules/public-api/public.routes.js';
import pocketRoute from './pockets.js';
import adminRoute from './admin.js';

import { appVersionChecker } from '../middleware/app_version_checker.js';
import { env } from '../../config/env.js';

const router = express.Router();

router.use(cookieParser(env.encryptionKey));

router.use('/public', publicRoute);

router.use(appVersionChecker());

router.use('/', authRoute);
router.use('/pockets', pocketRoute);
router.use('/mfa', mfaRoute);
router.use('/users', userRoute);
router.use('/congregations', congregationRoute);
router.use('/congregations/meeting', congregationMeetingEditorRoute);
router.use('/congregations/admin', congregationAdminRoute);
router.use('/admin', adminRoute);

export default router;
