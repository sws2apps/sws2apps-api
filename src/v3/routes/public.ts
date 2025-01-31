import express from 'express';
import { getStats } from '../controllers/public_controller.js';

const router = express.Router();

// get updated and latest schedules
router.get('/stats', getStats);

export default router;
