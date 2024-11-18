import express from 'express';

import authRoute from './auth.js';
import congregationRoute from './congregation.js';
import congregationAdminRoute from './congregation-admin.js';
import congregationMeetingEditorRoute from './congregation-meeting-editor.js';
import congregationSecretaryRoute from './congregation-secretary.js';
import userRoute from './users.js';
import adminRoute from './admin.js';
import mfaRoute from './mfa.js';
import swsPocketRoute from './sws-pocket.js';
import publicRoute from './public.js';

import { appVersionChecker } from '../middleware/app-version-checker.js';

const router = express.Router();

router.use('/public', publicRoute);

router.use(appVersionChecker());

router.use('/', authRoute);
router.use('/sws-pocket', swsPocketRoute);
router.use('/mfa', mfaRoute);
router.use('/users', userRoute);
router.use('/congregations', congregationRoute);
router.use('/congregations/meeting', congregationMeetingEditorRoute);
router.use('/congregations/secretary', congregationSecretaryRoute);
router.use('/congregations/admin', congregationAdminRoute);
router.use('/admin', adminRoute);

export default router;
