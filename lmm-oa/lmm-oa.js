// app dependencies
const express = require('express');
const router = express.Router();

// Create account route
router.get('/createaccount', async (req, res) => {
    res.status(200).send(JSON.stringify({message: 'I have received you request, but will add more information to it later'}))
})

module.exports = router;