import express from 'express';

import { visitorChecker } from '../middleware/visitor_checker.js';
import { adminAuthChecker } from '../middleware/admin_auth_checker.js';

import { deleteCongregation, getAllCongregations, logoutAdmin, validateAdmin } from '../controllers/admin_controller.js';

const router = express.Router();

// activate middleware
router.use(visitorChecker());
router.use(adminAuthChecker());

// validate user admin => passed middleware
router.get('/', validateAdmin);

// logout admin
router.get('/logout', logoutAdmin);

// get all congregations
router.get('/congregations', getAllCongregations);

// delete congregation
router.delete('/congregations/:id', deleteCongregation);

export default router;
