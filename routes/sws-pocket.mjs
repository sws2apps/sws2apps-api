// dependencies
import express from 'express';

// middleware import
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.mjs';

// init express router
const router = express.Router();
router.use(pocketAuthChecker());

// Login route
router.get('/login', async (req, res) => {
	res.status(200).json({ message: 'USER_LOGGED' });
});

export default router;
