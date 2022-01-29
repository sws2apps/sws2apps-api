// dependencies
import express from 'express';

// middleware import
import { internetChecker } from '../middleware/internet-checker.mjs';
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.mjs';

// init express router
const router = express.Router();
router.use(internetChecker());
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
