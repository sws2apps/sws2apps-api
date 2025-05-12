import express from 'express';
import { body } from 'express-validator';

import { visitorChecker } from '../middleware/visitor_checker.js';
import { adminAuthChecker } from '../middleware/admin_auth_checker.js';

import {
	congregationDataSyncToggle,
	congregationFlagToggle,
	congregationPersonsGet,
	createCongregation,
	deleteCongregation,
	flagDelete,
	flagsCreate,
	flagsGet,
	flagToggle,
	flagUpdate,
	getAllCongregations,
	logoutAdmin,
	userDelete,
	userDisable2FA,
	userFlagToggle,
	userRevokeToken,
	userSessionDelete,
	usersGetAll,
	userUpdate,
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

// create new congregation
router.post(
	'/congregations',
	body('country').isString(),
	body('name').notEmpty().isString().notEmpty(),
	body('number').isNumeric().notEmpty(),
	createCongregation
);

// get all congregations
router.get('/congregations', getAllCongregations);

// get congregation persons
router.get('/congregations/:id/persons', congregationPersonsGet);

// toggle congregation feature flag
router.patch('/congregations/:id/feature-flags', body('flagid').isString(), congregationFlagToggle);

// toggle data sync
router.patch('/congregations/:id/data-sync', congregationDataSyncToggle);

// delete congregation
router.delete('/congregations/:id', deleteCongregation);

// get all users
router.get('/users', usersGetAll);

// disable user mfa
router.get('/users/:id/disable-2fa', userDisable2FA);

// revoke user token
router.get('/users/:id/revoke-token', userRevokeToken);

// update an user
router.patch(
	'/users/:id',
	body('lastname').isString(),
	body('firstname').isString(),
	body('email').isString(),
	body('roles').isArray(),
	userUpdate
);

// toggle user feature flag
router.patch('/users/:id/feature-flags', body('flagid').isString(), userFlagToggle);

// delete user session
router.delete('/users/:id/sessions', body('identifiers').isArray(), userSessionDelete);

// delete an user
router.delete('/users/:id', userDelete);

// get all feature flags
router.get('/flags', flagsGet);

// create new feature flag
router.post(
	'/flags',
	body('name').isString().notEmpty(),
	body('desc').isString().notEmpty(),
	body('availability').isString().notEmpty(),
	flagsCreate
);

// toggle feature flag
router.get('/flags/:id/toggle', flagToggle);

// update a feature flag
router.patch(
	'/flags/:id',
	body('name').isString().notEmpty(),
	body('description').isString().notEmpty(),
	body('coverage').isNumeric(),
	flagUpdate
);

// delete feature flag
router.delete('/flags/:id', flagDelete);

export default router;
