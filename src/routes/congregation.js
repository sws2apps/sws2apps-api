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
	createNewPocketUser,
	deletePocketDevice,
	findUserByCongregation,
	generatePocketOTPCode,
	getCongregationBackup,
	getCongregationMembers,
	getCongregationPockerUser,
	getCongregationUser,
	getLastCongregationBackup,
	removeCongregationUser,
	requestCongregation,
	saveCongregationBackup,
	sendPocketSchedule,
	updateCongregationRole,
	updatePocketMembers,
	updatePocketUsername,
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
	body('cong_swsPocket').isArray(),
	body('cong_settings').isArray(),
	saveCongregationBackup
);

// get last backup data
router.get('/:id/backup', getCongregationBackup);

// post new sws pocket schedule
router.post(
	'/:id/schedule',
	body('cong_schedule').isObject(),
	body('cong_sourceMaterial').isObject(),
	sendPocketSchedule
);

// activate congregation admin role checker
router.use(congregationAdminChecker());

// get congregation users with roles
router.get('/:id/members', getCongregationMembers);

// find user by email from congregation
router.get('/:id/members/find?:search', findUserByCongregation);

// get congregation user
router.get('/:id/members/:user', getCongregationUser);

// remove user from congregation
router.delete('/:id/members/:user', removeCongregationUser);

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

// get congregation pocket user
router.get('/:id/pockets/:user', getCongregationPockerUser);

// create new pocket user
router.put(
	'/:id/pockets/:user',
	body('username').notEmpty(),
	createNewPocketUser
);

// update pocket username
router.patch(
	'/:id/pockets/:user/username',
	body('username').notEmpty(),
	updatePocketUsername
);

// update pocket members
router.patch(
	'/:id/pockets/:user/members',
	body('members').notEmpty(),
	updatePocketMembers
);

// generate new pocket otp code
router.get('/:id/pockets/:user/code', generatePocketOTPCode);

// delete pocket device
router.delete(
	'/:id/pockets/:user',
	body('pocket_visitorid').notEmpty(),
	deletePocketDevice
);

export default router;
