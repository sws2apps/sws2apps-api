import express from 'express';
import { getSchedules, isPublicationExist } from '../controllers/public-controller.js';

const router = express.Router();

// check if pub exist
router.get('/source-material/:language/:issue', isPublicationExist);

// get updated and latest schedules
router.get('/source-material/:language', getSchedules);

export default router;
