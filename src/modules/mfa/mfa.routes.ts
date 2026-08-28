import express from 'express';
import { body } from 'express-validator';
import { requireAuthenticatedSession } from '../../http/middleware/session-authentication.middleware.js';
import { verifyToken } from './mfa.controller.js';

const mfaRouter = express.Router();

mfaRouter.use(requireAuthenticatedSession());

mfaRouter.post('/verify-token', body('token').isNumeric().isLength({ min: 6, max: 6 }), verifyToken);

export default mfaRouter;
