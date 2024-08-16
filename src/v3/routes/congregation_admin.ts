import express from 'express';
import { body } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation_admin_checker.js';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	setCongregationMasterKey,
	setCongregationAccessCode,
	congregationMasterKeyGet,
	congregationAccessCodeGet,
} from '../controllers/congregation_admin_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationAdminChecker());

// set congregation master key
router.post('/:id/master-key', body('cong_master_key').isString().notEmpty().isLength({ min: 16 }), setCongregationMasterKey);

// set congregation access_code
router.post('/:id/access-code', body('cong_access_code').isString().notEmpty().isLength({ min: 8 }), setCongregationAccessCode);

// get congregation master key
router.get('/:id/master-key', congregationMasterKeyGet);

// get congregation access_code
router.get('/:id/access-code', congregationAccessCodeGet);

export default router;
