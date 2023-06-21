import { validationResult } from 'express-validator';
import { publicTalks } from '../classes/PublicTalk.js';
import { LANGUAGE_LIST } from '../locales/langList.js';

export const getAllPublicTalks = async (req, res, next) => {
	try {
		res.locals.type = 'info';
		res.locals.message = 'admin fetched all publc talks';
		res.status(200).json(publicTalks.list);
	} catch (err) {
		next(err);
	}
};

export const updatePublicTalk = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const talkNumber = +req.body.talkNumber;
		const talkTitle = req.body.talkTitle;
		const talkModified = req.body.talkModified;
		const language = req.body.language.toUpperCase();

		const isLangValid = LANGUAGE_LIST.find((lang) => lang.code.toUpperCase() === language);

		if (!isLangValid) {
			res.locals.type = 'warn';
			res.locals.message = `invalid language`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const payload = { talk_number: talkNumber, title: talkTitle, modified: talkModified };

		await publicTalks.update(language, payload);

		res.locals.type = 'info';
		res.locals.message = `admin updated public talk no. ${talkNumber}`;
		res.status(200).json({ message: 'TALK_LIST_UPDATED' });
	} catch (err) {
		next(err);
	}
};

export const bulkUpdatePublicTalks = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const language = req.body.language.toUpperCase();

		const isLangValid = LANGUAGE_LIST.find((lang) => lang.code.toUpperCase() === language);

		if (!isLangValid) {
			res.locals.type = 'warn';
			res.locals.message = `invalid language`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		for await (const talk of talks) {
			const payload = { talk_number: talk.talk_number, title: talk.title, modified: new Date().toISOString() };
			await publicTalks.update(language, payload);
		}

		res.locals.type = 'info';
		res.locals.message = `admin updated all public talks for ${language}`;
		res.status(200).json({ message: 'TALK_LIST_UPDATED' });
	} catch (err) {
		next(err);
	}
};
