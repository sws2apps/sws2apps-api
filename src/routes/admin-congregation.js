import express from 'express';
import { body } from 'express-validator';
import {
	addCongregationUser,
	addCongregationUserWithoutId,
	deleteCongregation,
	getAllCongregations,
	removeCongregationUser,
	updateCongregationUserRole,
} from '../controllers/admin-congregation-controller.js';

const router = express.Router();

// get all congregations
router.get('/', getAllCongregations);

// delete congregation
router.delete('/:id', deleteCongregation);

// add user to congregation without id
router.post(
	'/add-user',
	body('cong_country').notEmpty(),
	body('cong_name').notEmpty(),
	body('cong_number').notEmpty(),
	body('user_uid').notEmpty(),
	body('user_role').isArray(),
	addCongregationUserWithoutId
);

// add user to a congregation
router.patch('/:id/add-user', body('user_uid').notEmpty(), body('user_role').isArray(), addCongregationUser);

// remove user from a congregation
router.patch('/:id/remove-user', body('user_id').notEmpty(), removeCongregationUser);

// update user role in a congregation
router.patch('/:id/update-role', body('user_uid').notEmpty(), body('user_role').isArray(), updateCongregationUserRole);

export default router;
