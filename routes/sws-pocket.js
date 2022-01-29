//app dependencies
const express = require('express');

// load middleware
const internetChecker = require('../middleware/internet-checker');
const oauthChecker = require('../middleware/sws-pocket-auth-checker');

// init express router
const router = express.Router();
router.use(internetChecker());
router.use(oauthChecker());

// Login route
router.get('/login', async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
});

// Get schedules
router.get('/schedules', async (req, res) => {
	res.status(200).send(JSON.stringify({ message: 'OK' }));
});

module.exports = router;
