import express from 'express';
import { body } from 'express-validator';
import usersRoute from './admin-users.js';
import congregationsRoute from './admin-congregation.js';
import publicTalksRoute from './admin-public-talks.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import { adminAuthChecker } from '../middleware/admin-auth-checker.js';
import {
	getAdminDashboard,
	getBlockedRequests,
	logoutAdmin,
	unblockRequest,
	validateAdmin,
} from '../controllers/admin-controller.js';

const router = express.Router();

// activate middleware
router.use(visitorChecker());
router.use(adminAuthChecker());

// import sub-routes for admin
router.use('/congregations', congregationsRoute);
router.use('/users', usersRoute);
router.use('/public-talks', publicTalksRoute);

// validate user admin => passed middleware
router.get('/', validateAdmin);

// publish announcement
router.get('/dashboard', getAdminDashboard);

// logout admin
router.get('/logout', logoutAdmin);

// get all blocked requests
router.get('/blocked-requests', getBlockedRequests);

// unblock a request
router.post('/unblock-request', body('request_ip').notEmpty(), unblockRequest);

export default router;
