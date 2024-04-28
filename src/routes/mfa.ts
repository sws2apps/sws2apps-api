import express from 'express';
import { check } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import { verifyToken } from '../controllers/mfa_controller.js';

const router = express.Router();

router.use(visitorChecker());

// 2fa check
router.post('/verify-token', check('token').isNumeric().isLength({ min: 6 }), verifyToken);

export default router;
