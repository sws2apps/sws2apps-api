import express from 'express';
import { body, check } from 'express-validator';
import { congregationAdminChecker } from '../middleware/congregation-admin-checker.js';
import { congregationRoleChecker } from '../middleware/congregation-role-checker.js';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
	addCongregationUser,
	createCongregation,
	createNewPocketUser,
	deletePocketDevice,
	deletePocketOTPCode,
	findUserByCongregation,
	generatePocketOTPCode,
	getCongregationBackup,
	getCongregationMembers,
	getCongregationPockerUser,
	getCongregations,
	getCongregationUser,
	getCountries,
	getLastCongregationBackup,
	getMeetingSchedules,
	removeCongregationUser,
	saveCongregationBackup,
	sendPocketSchedule,
	updateCongregationInfo,
	updateCongregationMemberDetails,
	updatePocketDetails,
	updatePocketMembers,
	updatePocketUsername,
} from '../controllers/congregation-controller.js';

const router = express.Router();

router.use(visitorChecker());

router.get('/countries', check('language').isString().notEmpty(), getCountries);

router.get(
	'/list-by-country',
	check('language').isString().notEmpty(),
	check('country').isString().notEmpty(),
	check('name').isString().isLength({ min: 2 }),
	getCongregations
);

// create a new congregation
router.put(
	'/',
	body('email').isEmail(),
	body('cong_name').notEmpty(),
	body('cong_number').isNumeric(),
	body('app_requestor').notEmpty(),
	createCongregation
);

// get meeting schedule
router.get('/:id/meeting-schedule', getMeetingSchedules);

// activate role checker middleware
router.use(congregationRoleChecker());

// create a new congregation
router.patch('/:id', body('cong_name').notEmpty(), body('cong_number').isNumeric(), updateCongregationInfo);

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
router.post('/:id/schedule', body('schedules').isArray(), body('cong_settings').isArray(), sendPocketSchedule);

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
router.put('/:id/members', body('user_id').isString(), addCongregationUser);

// update user role in congregation
router.patch(
	'/:id/members/:user',
	body('user_role').isArray(),
	body('pocket_local_id').exists(),
	body('pocket_members').isArray(),
	updateCongregationMemberDetails
);

// get congregation pocket user
router.get('/:id/pockets/:user', getCongregationPockerUser);

// create new pocket user
router.put('/:id/pockets', body('pocket_local_id').exists(), body('username').notEmpty().isString(), createNewPocketUser);

// update pocket member
router.patch('/:id/pockets/:user', body('cong_role').isArray(), body('pocket_members').isArray(), updatePocketDetails);

// update pocket username
router.patch('/:id/pockets/:user/username', body('username').notEmpty(), updatePocketUsername);

// update pocket members
router.patch('/:id/pockets/:user/members', body('members').notEmpty(), updatePocketMembers);

// generate new pocket otp code
router.get('/:id/pockets/:user/code', generatePocketOTPCode);

// delete pocket otp code
router.delete('/:id/pockets/:user/code', deletePocketOTPCode);

// delete pocket device
router.delete('/:id/pockets/:user', body('pocket_visitorid').notEmpty(), deletePocketDevice);

export default router;
