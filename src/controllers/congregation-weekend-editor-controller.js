import { validationResult } from 'express-validator';
import { congregations } from '../classes/Congregations.js';
import { publicTalks } from '../classes/PublicTalk.js';
import { LANGUAGE_LIST } from '../locales/langList.js';

export const getPublicTalks = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		res.locals.type = 'info';
		res.locals.message = 'user fetched public talks';
		res.status(200).json(publicTalks.list);
	} catch (err) {
		next(err);
	}
};

export const userBulkUpdatePublicTalks = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
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

		const talks = req.body.talks;

		const talksToUpdate = [];

		for (const talk of talks) {
			const findTalk = publicTalks.find(talk.talk_number);

			if (talk.talk_title !== findTalk[language].title) {
				talksToUpdate.push(talk);
			}
		}

		for await (const talk of talksToUpdate) {
			const payload = { talk_number: talk.talk_number, title: talk.talk_title, modified: talk.talk_modified };
			await publicTalks.update(language, payload);
		}

		res.locals.type = 'info';
		res.locals.message = `user updated public talks for ${language}`;
		res.status(200).json({ message: 'TALK_LIST_UPDATED' });
	} catch (err) {
		next(err);
	}
};

export const updateVisitingSpeakers = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const speakers = req.body.speakers;
		await cong.updateVisitingSpeakersList(speakers);

		res.locals.type = 'info';
		res.locals.message = `user updated visiting speakers list`;
		res.status(200).json({ message: 'VISITING_SPEAKERS_UPDATED' });
	} catch (err) {
		next(err);
	}
};

export const findVisitingSpeakersCongregations = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

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

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation id params is undefined';
			res.status(400).json({ message: 'CONG_ID_INVALID' });
			return;
		}

		const cong = await congregations.findCongregationById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = await cong.isMember(uid);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const name = req.headers.name;
		const result = cong.findVisitingSpeakersCongregations(name);

		res.locals.type = 'info';
		res.locals.message = `user updated visiting speakers list`;
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};
