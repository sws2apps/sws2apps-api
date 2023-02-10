import express from 'express';
import { getScheduleRawHTML, getSchedules, getSchedulesDocIds, isPublicationExist } from '../controllers/public-controller.js';

const router = express.Router();

// check if pub exist
router.get('/source-material/:language/:issue', isPublicationExist);

// get schedule doc ids
router.get('/source-material/:language/:issue/docs-id', getSchedulesDocIds);

// get schedule raw html text
router.get('/source-material/:language/:docid/content', getScheduleRawHTML);

// get updated and latest schedules
router.get('/source-material/:language', getSchedules);

export default router;
