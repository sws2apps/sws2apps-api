import express from 'express';
import {
	deleteUser,
	disableUser,
	enableUser,
	findUser,
	getAllUsers,
	makeUserAdmin,
	revokeUserToken,
} from '../controllers/admin-users-controller.js';

const router = express.Router();

// get all users
router.get('/', getAllUsers);

// delete a user
router.delete('/:id', deleteUser);

// enable a user
router.patch('/:id/enable', enableUser);

// disable a user
router.patch('/:id/disable', disableUser);

// revoke two-factor token for a user
router.patch('/:id/revoke-token', revokeUserToken);

// make user as admin
router.patch('/:id/make-admin', makeUserAdmin);

// find a user by email address
router.get('/find', findUser);

export default router;
