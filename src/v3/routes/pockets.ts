import express from 'express';
import { body } from 'express-validator';
import { pocketVisitorChecker } from '../middleware/visitor_checker.js';
import { retrieveUserBackup, validateInvitation, validatePocket } from '../controllers/pockets_controller.js';

const router = express.Router();

// signup by validating invitation code
router.post('/signup', body('code').isString().notEmpty(), validateInvitation);

// activate middleware at this point
router.use(pocketVisitorChecker());

// validate user for active session
router.get('/validate-me', validatePocket);

// retrieve user backup
router.get('/backup', retrieveUserBackup);

export default router;
