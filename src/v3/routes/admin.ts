import express from 'express';

import { visitorChecker } from '../middleware/visitor_checker.js';
import { adminAuthChecker } from '../middleware/admin_auth_checker.js';

import {
	congregationPersonsGet,
	deleteCongregation,
	getAllCongregations,
	logoutAdmin,
	userDelete,
	userDisable2FA,
	userRevokeToken,
	usersGetAll,
	validateAdmin,
} from '../controllers/admin_controller.js';

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

// get congregation persons
router.get('/congregations/:id/persons', congregationPersonsGet);

// delete congregation
router.delete('/congregations/:id', deleteCongregation);

// get all users
router.get('/users', usersGetAll);

// disable user mfa
router.get('/users/:id/disable-2fa', userDisable2FA);

// revoke user token
router.get('/users/:id/revoke-token', userRevokeToken);

// delete an user
router.delete('/users/:id', userDelete);

export default router;
