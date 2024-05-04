import { validationResult } from 'express-validator';
import { congregations } from '../classes/Congregations.js';
import { publicTalks } from '../classes/PublicTalk.js';
import { LANGUAGE_LIST } from '../../locales/langList.js';

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

		const cong = congregations.findCongregationById(id);

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

		const cong = congregations.findCongregationById(id);

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

		const cong = congregations.findCongregationById(id);

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

		const cong = congregations.findCongregationById(id);

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

export const requestAccessSpeakersCongregation = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const requestCongId = req.body.cong_id;
		const requestCong = congregations.findCongregationById(requestCongId);

		if (!requestCong) {
			res.locals.type = 'warn';
			res.locals.message = 'the requested congregation does not exist';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		await cong.requestAccessCongregationSpeakers(requestCongId);

		res.locals.type = 'info';
		res.locals.message = `user requested access to a congregation`;
		res.status(200).json({ message: 'ACCESS_REQUESTED' });
	} catch (err) {
		next(err);
	}
};

export const getCongregationSpeakersRequests = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const requests = cong.speakersRequests();

		res.locals.type = 'info';
		res.locals.message = `user fetched congregation speakers requests`;
		res.status(200).json(requests);
	} catch (err) {
		next(err);
	}
};

export const getCongregationSpeakersRequestsStatus = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const tmpList = req.headers.congs;
		const congsList = tmpList.split(';');

		const result = cong.speakersRequestsStatus(congsList);

		res.locals.type = 'info';
		res.locals.message = `user fetched congregation requests status`;
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const approveCongregationSpeakersRequest = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const cong_id = req.headers.cong_id;
		await cong.speakersRequestApprove(cong_id);

		res.locals.type = 'info';
		res.locals.message = `user approve congregation speakers request`;
		res.status(200).json({ message: 'CONGREGATION_REQUEST_APPROVE' });
	} catch (err) {
		next(err);
	}
};

export const disapproveCongregationSpeakersRequest = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const cong_id = req.headers.cong_id;
		await cong.speakersRequestDisapprove(cong_id);

		res.locals.type = 'info';
		res.locals.message = `user disapprove congregation speakers request`;
		res.status(200).json({ message: 'CONGREGATION_REQUEST_DISAPPROVE' });
	} catch (err) {
		next(err);
	}
};

export const getVisitingSpeakers = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const tmpList = req.headers.congs;
		const congsList = tmpList.split(';');

		const result = cong.visitingSpeakers(congsList);

		res.locals.type = 'info';
		res.locals.message = `user fetched congregations speakers list`;
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const getApprovedVisitingSpeakersAccess = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const access = cong.speakersAccess();

		res.locals.type = 'info';
		res.locals.message = `user fetched congregation speakers access`;
		res.status(200).json(access);
	} catch (err) {
		next(err);
	}
};

export const updateVisitingSpeakersAccess = async (req, res, next) => {
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

		const cong = congregations.findCongregationById(id);

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

		const congs = req.body.congs;
		const access = await cong.updateSpeakersAccess(congs);

		res.locals.type = 'info';
		res.locals.message = `user updated congregation speakers access`;
		res.status(200).json(access);
	} catch (err) {
		next(err);
	}
};

export const sendPocketSchedule = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { uid } = req.headers;

		if (id) {
			const cong = congregations.findCongregationById(id);
			if (cong) {
				const isValid = await cong.isMember(uid);

				if (isValid) {
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

					const { schedules, cong_settings } = req.body;

					await cong.sendPocketSchedule(schedules, cong_settings);

					res.locals.type = 'info';
					res.locals.message = 'schedule save for sws pocket application';
					res.status(200).json({ message: 'SCHEDULE_SENT' });
					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'user not authorized to access the provided congregation';
				res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
				return;
			}

			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });
	} catch (err) {
		next(err);
	}
};
