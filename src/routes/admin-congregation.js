import express from 'express';
import { body } from 'express-validator';
import {
	addCongregationUser,
	approveCongregationRequest,
	deleteCongregation,
	disapproveCongregationRequest,
	getAllCongregations,
	getCongregationRequests,
	removeCongregationUser,
	updateCongregationUserRole,
} from '../controllers/admin-congregation-controller.js';

const router = express.Router();

// get all congregations
router.get('/', getAllCongregations);

// get all congregation requests
router.get('/requests', getCongregationRequests);

// approve congregation request
router.put('/:id/approve', approveCongregationRequest);

// disapprove congregation request
router.put('/:id/disapprove', body('reason').notEmpty(), disapproveCongregationRequest);

// delete congregation
router.delete('/:id', deleteCongregation);

// add user to a congregation
router.patch('/:id/add-user', body('user_uid').notEmpty(), body('user_role').isArray(), addCongregationUser);

// remove user from a congregation
router.patch('/:id/remove-user', body('user_id').notEmpty(), removeCongregationUser);

// update user role in a congregation
router.patch('/:id/update-role', body('user_uid').notEmpty(), body('user_role').isArray(), updateCongregationUserRole);

export default router;
