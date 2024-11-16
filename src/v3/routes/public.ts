import express from 'express';
import { getSchedules } from '../controllers/public_controller.js';

const router = express.Router();

// get updated and latest schedules
router.get('/source-material/:language', getSchedules);

export default router;
