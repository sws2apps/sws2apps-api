import express from 'express';
import { header } from 'express-validator';

import { getFeatureFlags, getStats } from '../controllers/public_controller.js';

const router = express.Router();

// get updated and latest schedules
router.get('/stats', getStats);

// get app feature flag
router.get('/feature-flags', header('installation').isString().notEmpty(), header('user').isString(), getFeatureFlags);

export default router;
