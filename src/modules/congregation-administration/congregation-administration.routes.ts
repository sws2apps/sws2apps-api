import express from 'express';
import { body, header } from 'express-validator';
import { requireCongregationAdministrator } from '../../http/middleware/authorization.middleware.js';
import { requireAuthenticatedSession } from '../../http/middleware/session-authentication.middleware.js';
import { REQUEST_LIMITS } from '../../http/request-limits.js';
import {
	acceptJoinRequest,
	deleteJoinRequest,
} from './congregation-administration-join-requests.controller.js';
import {
	congregationAccessCodeGet,
	congregationMasterKeyGet,
	deleteCongregation,
	setCongregationAccessCode,
	setCongregationMasterKey,
} from './congregation-administration-security.controller.js';
import {
	congregationDeleteUser,
	congregationGetUsers,
	congregationUserAdd,
	globalSearchUser,
	pocketCodeDelete,
	pocketUserAdd,
	setAdminUserUid,
	userDetailsUpdate,
	userSessionDelete,
} from './congregation-administration-users.controller.js';
import { isValidCongregationRoleList } from './role-validation.js';

const congregationAdministrationRouter = express.Router();

congregationAdministrationRouter.use(requireAuthenticatedSession());
congregationAdministrationRouter.use(requireCongregationAdministrator());

// set congregation master key
congregationAdministrationRouter.post('/:id/local-uid', body('user_uid').isString().notEmpty(), setAdminUserUid);

// set congregation master key
congregationAdministrationRouter.post(
	'/:id/master-key',
	body('cong_master_key').isString().notEmpty().isLength({
		min: 16,
		max: REQUEST_LIMITS.securityValue,
	}),
	setCongregationMasterKey,
);

// set congregation access_code
congregationAdministrationRouter.post(
	'/:id/access-code',
	body('cong_access_code').isString().notEmpty().isLength({
		min: 8,
		max: REQUEST_LIMITS.securityValue,
	}),
	setCongregationAccessCode,
);

// get congregation master key
congregationAdministrationRouter.get('/:id/master-key', congregationMasterKeyGet);

// get congregation access_code
congregationAdministrationRouter.get('/:id/access-code', congregationAccessCodeGet);

// get congregation users
congregationAdministrationRouter.get('/:id/users', congregationGetUsers);

// create a new user
congregationAdministrationRouter.post(
	'/:id/users',
	body('user_firstname').isString(),
	body('user_lastname').isString(),
	body('user_id').notEmpty().isString(),
	body('cong_role').custom(isValidCongregationRoleList),
	body('cong_person_uid').isString(),
	congregationUserAdd,
);

// delete congregation user
congregationAdministrationRouter.delete('/:id/users/:user', congregationDeleteUser);

// create a new pocket user
congregationAdministrationRouter.post(
	'/:id/pocket-user',
	body('user_firstname').notEmpty().isString(),
	body('user_lastname').notEmpty().isString(),
	body('user_secret_code')
		.notEmpty()
		.isString()
		.isLength({ max: REQUEST_LIMITS.securityValue }),
	body('cong_role').custom(isValidCongregationRoleList),
	body('cong_person_uid').notEmpty().isString(),
	pocketUserAdd,
);

// update congregation member details
congregationAdministrationRouter.patch(
	'/:id/users/:user',
	body('cong_role').custom(isValidCongregationRoleList),
	body('cong_person_uid').isString(),
	body('cong_person_delegates').isArray(),
	body('first_name').isString(),
	body('last_name').isString(),
	userDetailsUpdate,
);

// delete congregation user session
congregationAdministrationRouter.delete(
	'/:id/users/:user/sessions',
	body('identifier')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	userSessionDelete,
);

// delete congregation user pocket code
congregationAdministrationRouter.delete('/:id/pocket-user/:user', pocketCodeDelete);

// global search user
congregationAdministrationRouter.get('/:id/users/global', globalSearchUser);

// delete a congregation
congregationAdministrationRouter.delete(
	'/:id/erase',
	body('key').isString().notEmpty().isLength({
		min: 16,
		max: REQUEST_LIMITS.securityValue,
	}),
	deleteCongregation,
);

// accept a join request
congregationAdministrationRouter.patch(
	'/:id/join-requests',
	header('user').isString().notEmpty(),
	body('role').custom(isValidCongregationRoleList),
	body('person_uid').isString().notEmpty(),
	body('firstname').isString(),
	body('lastname').isString(),
	acceptJoinRequest,
);

// delete a join request
congregationAdministrationRouter.delete(
	'/:id/join-requests',
	header('user').isString().notEmpty(),
	deleteJoinRequest,
);

export default congregationAdministrationRouter;
