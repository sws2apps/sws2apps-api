import express from 'express';
import { body } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation-admin-checker.js';
import { congregationRoleChecker } from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	addCongregationUser,
	createNewPocketUser,
	deletePocketDevice,
	deletePocketOTPCode,
	findUserByCongregation,
	generatePocketOTPCode,
	getCongregationMembers,
	getCongregationPockerUser,
	getCongregationUser,
	removeCongregationUser,
	updateCongregationMemberDetails,
	updatePocketDetails,
	updateMembersDelegate,
	updatePocketUsername,
} from '../controllers/congregation-admin-controller.js';

const router = express.Router();

router.use(visitorChecker());
router.use(congregationRoleChecker());
router.use(congregationAdminChecker());

// get congregation users with roles
router.get('/:id/members', getCongregationMembers);

// find user by email from congregation
router.get('/:id/members/find', findUserByCongregation);

// get congregation user
router.get('/:id/members/:user', getCongregationUser);

// remove user from congregation
router.delete('/:id/members/:user', removeCongregationUser);

// add user to congregation
router.put('/:id/members', body('user_id').isString(), addCongregationUser);

// update user role in congregation
router.patch(
	'/:id/members/:user',
	body('user_role').isArray(),
	body('user_members_delegate').isArray(),
	updateCongregationMemberDetails
);

// get congregation pocket user
router.get('/:id/pockets/:user', getCongregationPockerUser);

// create new pocket user
router.put(
	'/:id/pockets',
	body('user_local_uid').notEmpty().isString(),
	body('username').notEmpty().isString(),
	createNewPocketUser
);

// update pocket member
router.patch(
	'/:id/pockets/:user',
	body('user_local_uid').notEmpty().isString(),
	body('user_role').isArray(),
	body('user_members_delegate').isArray(),
	updatePocketDetails
);

// update pocket username
router.patch('/:id/pockets/:user/username', body('username').notEmpty(), updatePocketUsername);

// update pocket members
router.patch('/:id/pockets/:user/members', body('members').notEmpty(), updateMembersDelegate);

// generate new pocket otp code
router.get('/:id/pockets/:user/code', generatePocketOTPCode);

// delete pocket otp code
router.delete('/:id/pockets/:user/code', deletePocketOTPCode);

// delete pocket device
router.delete('/:id/pockets/:user', body('pocket_visitorid').notEmpty(), deletePocketDevice);

export default router;
