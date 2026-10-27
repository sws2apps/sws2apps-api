import express from 'express';
import { requireAuthenticatedSession, requirePocketSession } from '#http/middleware/session-authentication.middleware.js';
import { validateRequest } from '#http/validation-errors.js';
import { listPartnerRequests, mutatePartnerRequest } from './partner.controller.js';
import { partnerMutationValidation, partnerResourceValidation } from './partner.validation.js';

const router = express.Router();
router.get('/congregations/:id', requireAuthenticatedSession(), partnerResourceValidation, validateRequest, listPartnerRequests);
router.post('/congregations/:id', requireAuthenticatedSession(), partnerResourceValidation, partnerMutationValidation, validateRequest, mutatePartnerRequest);
router.get('/pockets/:id', requirePocketSession(), partnerResourceValidation, validateRequest, listPartnerRequests);
router.post('/pockets/:id', requirePocketSession(), partnerResourceValidation, partnerMutationValidation, validateRequest, mutatePartnerRequest);
export default router;
