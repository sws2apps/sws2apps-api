import express from 'express';
import { body } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation_admin_checker.js';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	setCongregationMasterKey,
	setCongregationAccessCode,
	congregationMasterKeyGet,
	congregationAccessCodeGet,
	pocketUserAdd,
	congregationGetUsers,
	userDetailsUpdate,
	userSessionDelete,
	pocketCodeDelete,
	globalSearchUser,
	congregationUserAdd,
	congregationDeleteUser,
	setAdminUserUid,
} from '../controllers/congregation_admin_controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationAdminChecker());

// set congregation master key
router.post('/:id/local-uid', body('user_uid').isString().notEmpty(), setAdminUserUid);

// set congregation master key
router.post('/:id/master-key', body('cong_master_key').isString().notEmpty().isLength({ min: 16 }), setCongregationMasterKey);

// set congregation access_code
router.post('/:id/access-code', body('cong_access_code').isString().notEmpty().isLength({ min: 8 }), setCongregationAccessCode);

// get congregation master key
router.get('/:id/master-key', congregationMasterKeyGet);

// get congregation access_code
router.get('/:id/access-code', congregationAccessCodeGet);

// get congregation users
router.get('/:id/users', congregationGetUsers);

// create a new user
router.post(
	'/:id/users',
	body('user_firstname').notEmpty().isString(),
	body('user_lastname').notEmpty().isString(),
	body('user_id').notEmpty().isString(),
	body('cong_role').notEmpty().isArray(),
	body('cong_person_uid').notEmpty().isString(),
	congregationUserAdd
);

// delete congregation user
router.delete('/:id/users/:user', congregationDeleteUser);

// create a new pocket user
router.post(
	'/:id/pocket-user',
	body('user_firstname').notEmpty().isString(),
	body('user_lastname').notEmpty().isString(),
	body('user_secret_code').notEmpty().isString(),
	body('cong_role').notEmpty().isArray(),
	body('cong_person_uid').notEmpty().isString(),
	pocketUserAdd
);

// update congregation member details
router.patch(
	'/:id/users/:user',
	body('cong_role').notEmpty().isArray(),
	body('cong_person_uid').notEmpty().isString(),
	body('cong_person_delegates').notEmpty().isArray(),
	userDetailsUpdate
);

// delete congregation user session
router.delete('/:id/users/:user/sessions', body('identifier').notEmpty(), userSessionDelete);

// delete congregation user pocket code
router.delete('/:id/pocket-user/:user', pocketCodeDelete);

// global search user
router.get('/:id/users/global', globalSearchUser);

export default router;
