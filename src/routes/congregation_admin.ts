import express from 'express';
import { body } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation_admin_checker.js';
import { visitorChecker } from '../middleware/visitor_checker.js';
import { setCongregationMasterKey, setCongregationPassword } from '../controllers/congregation_admin_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationAdminChecker());

// set congregation master key
router.post('/:id/master-key', body('cong_master_key').isString().notEmpty().isLength({ min: 16 }), setCongregationMasterKey);

// set congregation password
router.post('/:id/password', body('cong_password').isString().notEmpty().isLength({ min: 8 }), setCongregationPassword);

export default router;
