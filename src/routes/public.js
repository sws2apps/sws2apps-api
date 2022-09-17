import express from 'express';
import { body } from 'express-validator';
import { getUpdatedSchedules } from '../controllers/public-controller.js';

const router = express.Router();

// get updated and latest schedules
router.post(
	'/source-material',
	body('language').notEmpty(),
	getUpdatedSchedules
);

export default router;