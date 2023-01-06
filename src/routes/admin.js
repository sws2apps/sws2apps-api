import express from 'express';
import { body } from 'express-validator';
import usersRoute from './admin-users.js';
import congregationsRoute from './admin-congregation.js';
import geoRoute from './admin-geo.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import { adminAuthChecker } from '../middleware/admin-auth-checker.js';
import {
	deleteAnnouncementAdmin,
	getAdminDashboard,
	getAllAnnouncements,
	getAnnouncementAdmin,
	getBlockedRequests,
	handleAnnouncementAction,
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
router.use('/geo', geoRoute);
router.use('/users', usersRoute);

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

// get all announcements
router.get('/announcements', getAllAnnouncements);

// handle announcement action
router.post('/announcements', body('announcement').isObject(), body('action').isString(), handleAnnouncementAction);

// get announcement for editing
router.get('/announcement', getAnnouncementAdmin);

// delete announcement
router.delete('/announcement', deleteAnnouncementAdmin);

export default router;
