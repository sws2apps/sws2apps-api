import express from 'express';
import { body } from 'express-validator';

import { requireAuthenticatedSession } from '../../http/middleware/session-authentication.middleware.js';
import { requireGlobalAdministrator } from '../../http/middleware/authorization.middleware.js';
import { validateRequest } from '../../http/validation-errors.js';

import {
	congregationDataSyncToggle,
	congregationDeleteRequest,
	congregationGet,
	congregationResetSpeakersKey,
	createCongregation,
	deleteCongregation,
	getAllCongregations,
	updateBasicCongregationInfo,
} from './administration-congregations.controller.js';
import {
	logoutAdmin,
	validateAdmin,
} from './administration-session.controller.js';
import {
	userAssignCongregation,
	userDelete,
	userDisable2FA,
	userRemoveCongregation,
	userRevokeToken,
	userSessionDelete,
	usersGetAll,
	userUpdate,
} from './administration-users.controller.js';
import {
	congregationFlagToggle,
	flagDelete,
	flagsCreate,
	flagsGet,
	flagToggle,
	flagUpdate,
	userFlagToggle,
} from './administration-flags.controller.js';
import {
	getClientVersion,
	updateClientVersion,
} from './administration-settings.controller.js';
import { isValidFeatureFlagAvailability } from './feature-flag-validation.js';

const router = express.Router();

// activate middleware
router.use(requireAuthenticatedSession());
router.use(requireGlobalAdministrator());

// validate user admin => passed middleware
router.get('/', validateAdmin);

// logout admin
router.get('/logout', logoutAdmin);

// get minimum client
router.get('/client-version', getClientVersion);

// get minimum client
router.post('/client-version', body('version').isString().matches(/^\d+(?:\.\d+)*$/), validateRequest, updateClientVersion);

// create new congregation
router.post(
	'/congregations',
	body('country').isString(),
	body('name').notEmpty().isString().notEmpty(),
	body('number').isNumeric().notEmpty(),
	validateRequest,
	createCongregation,
);

// get all congregations
router.get('/congregations', getAllCongregations);

// get congregation persons
router.get('/congregations/:id', congregationGet);

// toggle congregation feature flag
router.patch('/congregations/:id/feature-flags', body('flagid').isString().notEmpty(), validateRequest, congregationFlagToggle);

// toggle data sync
router.patch('/congregations/:id/data-sync', congregationDataSyncToggle);

// update congregation name and number
router.patch(
	'/congregations/:id',
	body('name').notEmpty().isString(),
	body('number').optional().isString(),
	body('guid').notEmpty().isString(),
	validateRequest,
	updateBasicCongregationInfo,
);

// reset speakers key
router.delete('/congregations/:id/speakers-key', congregationResetSpeakersKey);

// delete congregation access request
router.delete('/congregations/:id/requests/:request', congregationDeleteRequest);

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
	body('roles').isArray({ min: 1 }),
	validateRequest,
	userUpdate,
);

// toggle user feature flag
router.patch('/users/:id/feature-flags', body('flagid').isString().notEmpty(), validateRequest, userFlagToggle);

// delete user session
router.delete('/users/:id/sessions', body('identifiers').isArray({ min: 1 }), validateRequest, userSessionDelete);

// remove user congregation
router.delete('/users/:id/congregation', userRemoveCongregation);

// delete an user
router.delete('/users/:id', userDelete);

// assign user to congregation
router.patch('/users/:id/congregation', body('congregation').isString().notEmpty(), validateRequest, userAssignCongregation);

// get all feature flags
router.get('/flags', flagsGet);

// create new feature flag
router.post(
	'/flags',
	body('name').isString().notEmpty(),
	body('desc').isString().notEmpty(),
	body('availability').custom(isValidFeatureFlagAvailability),
	validateRequest,
	flagsCreate,
);

// toggle feature flag
router.get('/flags/:id/toggle', flagToggle);

// update a feature flag
router.patch(
	'/flags/:id',
	body('name').isString().notEmpty(),
	body('description').isString().notEmpty(),
	body('coverage').isFloat({ min: 0, max: 100 }),
	validateRequest,
	flagUpdate,
);

// delete feature flag
router.delete('/flags/:id', flagDelete);

export default router;

