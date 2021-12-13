// app dependencies
const express = require('express');
const router = express.Router();

// Create account route
router.get('/createaccount', async (req, res) => {
    res.status(200).send(JSON.stringify({message: 'Testing staging deployement'}))
})

module.exports = router;
