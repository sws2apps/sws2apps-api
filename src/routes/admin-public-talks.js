import express from 'express';
import { body } from 'express-validator';
import { getAllPublicTalks, updatePublicTalk, bulkUpdatePublicTalks } from '../controllers/admin-public-talks-controller.js';

const router = express.Router();

// get all public talks
router.get('/', getAllPublicTalks);

// add user to a congregation
router.patch(
	'/',
	body('language').isString().notEmpty(),
	body('talkNumber').isNumeric(),
	body('talkTitle').isString(),
	body('talkModified').isString().notEmpty(),
	updatePublicTalk
);

router.post('/', body('language').isString().notEmpty(), body('talks').isArray().notEmpty(), bulkUpdatePublicTalks);

export default router;
