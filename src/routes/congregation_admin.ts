import express from 'express';
import { body } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation_admin_checker.js';
import { visitorChecker } from '../middleware/visitor_checker.js';
import { setCongregationEncryptionKey } from '../controllers/congregation_admin_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationAdminChecker());

// set congregation encryption code
router.post('/:id/encryption', body('encryption_code').isString().notEmpty(), setCongregationEncryptionKey);

export default router;
