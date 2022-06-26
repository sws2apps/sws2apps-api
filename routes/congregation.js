// dependencies
import express from 'express';
import { body } from 'express-validator';

// middleware import
import { congregationAdminChecker } from '../middleware/congregation-admin-checker.js';
import { congregationRoleChecker } from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';

// import controller
import {
	addCongregationUser,
	findUserByCongregation,
	getCongregationBackup,
	getCongregationMembers,
	getCongregationUser,
	getLastCongregationBackup,
	removeCongregationUser,
	requestCongregation,
	saveCongregationBackup,
	updateCongregationRole,
} from '../controllers/congregation-controller.js';

const router = express.Router();

router.use(visitorChecker());

// request a new congregation
router.put(
	'/',
	body('email').isEmail(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('app_requestor').notEmpty(),
	requestCongregation
);

// activate role checker middleware
router.use(congregationRoleChecker());

// get last backup information
router.get('/:id/backup/last', getLastCongregationBackup);

// save congregation backup
router.post(
	'/:id/backup',
	body('cong_persons').isArray(),
	body('cong_schedule').isArray(),
	body('cong_sourceMaterial').isArray(),
	saveCongregationBackup
);

// get last backup data
router.get('/:id/backup', getCongregationBackup);

// activate congregation admin role checker
router.use(congregationAdminChecker());

// get congregation users with roles
router.get('/:id/members', getCongregationMembers);

// get congregation user
router.get('/:id/members/:user', getCongregationUser);

// remove user from congregation
router.delete('/:id/members/:user', removeCongregationUser);

// find user by email from congregation
router.get('/:id/members/find?:search', findUserByCongregation);

// add user to congregation
router.put(
	'/:id/members/:user',
	body('user_role').isArray(),
	addCongregationUser
);

// update user role in congregation
router.patch(
	'/:id/members/:user/role',
	body('user_role').isArray(),
	updateCongregationRole
);

export default router;
