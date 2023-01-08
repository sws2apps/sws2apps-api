import express from 'express';
import { body } from 'express-validator';
import { getSchedule, pocketDeleteDevice, pocketSignUp, validatePocket } from '../controllers/sws-pocket-controller.js';
import { getUserDevices } from '../controllers/sws-pocket-controller.js';
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.js';

const router = express.Router();

router.post('/signup', body('visitorid').notEmpty(), body('otp_code').isLength({ min: 10 }).contains('-'), pocketSignUp);

// activate auth checker middleware
router.use(pocketAuthChecker());

router.get('/validate-me', validatePocket);

router.get('/meeting-schedule', getSchedule);

// get user sessions
router.get('/:id/devices', getUserDevices);

// delete pocket device
router.delete('/:id/devices', body('pocket_visitorid').notEmpty(), pocketDeleteDevice);

export default router;
