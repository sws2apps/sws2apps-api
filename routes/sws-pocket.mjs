// dependencies
import express from 'express';

// middleware import
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.mjs';

// init express router
const router = express.Router();
router.use(pocketAuthChecker());

// Login route
router.get('/login', async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
});

// Get schedules
router.get('/schedules', async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
});

export default router;
