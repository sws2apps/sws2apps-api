import express from 'express';
import { body, header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor-checker.js';
import {
  createAccount,
  deleteUserSession,
  getAnnouncements,
  getUserSecretToken,
  getUserSessions,
  resendVerificationEmail,
  updateUserFullname,
  updateUserPassword,
  userLogout,
  validateUser,
} from '../controllers/users-controller.js';

const router = express.Router();

// create a new user account
router.post('/create-account', body('fullname').isLength({ min: 3 }), body('email').isEmail(), body('password').isLength({ min: 10 }), createAccount);

// get announcements
router.get('/announcement', getAnnouncements);

// resend verification email
router.get('/resend-verification', header('email').isEmail(), resendVerificationEmail);

// activate middleware at this point
router.use(visitorChecker());

// validate user for active session
router.get('/validate-me', validateUser);

// update user fullname
router.patch('/:id/fullname', body('fullname').isLength({ min: 3 }), updateUserFullname);

// update user password
router.patch('/:id/password', body('password').isLength({ min: 10 }), updateUserPassword);

// get user 2fa token
router.get('/:id/2fa', getUserSecretToken);

// get user sessions
router.get('/:id/sessions', getUserSessions);

// delete user session
router.delete('/:id/sessions', body('session').notEmpty(), deleteUserSession);

// logout current user session
router.get('/logout', userLogout);

export default router;
