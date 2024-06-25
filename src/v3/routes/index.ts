import express from 'express';
import cookieParser from 'cookie-parser';

import authRoute from './auth.js';
import congregationRoute from './congregation.js';
import congregationMeetingEditorRoute from './congregation_meeting_editor.js';
import congregationAdminRoute from './congregation_admin.js';
import userRoute from './users.js';
import mfaRoute from './mfa.js';
import publicRoute from './public.js';

import { appVersionChecker } from '../middleware/app_version_checker.js';

const router = express.Router();

router.use(cookieParser(process.env.SEC_ENCRYPT_KEY || 'DON’T_FORGET_TO_SET_KEY_IN_PROD'));

router.use('/public', publicRoute);

router.use(appVersionChecker());

router.use('/', authRoute);
router.use('/mfa', mfaRoute);
router.use('/users', userRoute);
router.use('/congregations', congregationRoute);
router.use('/congregations/meeting', congregationMeetingEditorRoute);
router.use('/congregations/admin', congregationAdminRoute);

export default router;
