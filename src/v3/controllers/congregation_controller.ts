import fetch from 'node-fetch';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CongregationsList } from '../classes/Congregations.js';
import { ApiCongregationSearchResponse, BackupData, CongregationUpdatesType } from '../definition/congregation.js';
import { sendWelcomeMessage } from '../services/mail/sendEmail.js';
import { formatError } from '../utils/format_log.js';
import { ROLE_MASTER_KEY } from '../constant/base.js';
import { StandardRecord } from '../definition/app.js';

const isDev = process.env.NODE_ENV === 'development';

export const saveCongregationBackup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const last_backup = req.headers.lastbackup as string;

		if (last_backup !== cong.settings.last_backup) {
			res.locals.type = 'info';
			res.locals.message = 'backup action rejected since it was changed recently';
			res.status(400).json({ message: 'BACKUP_OUTDATED' });
			return;
		}

		const user = res.locals.currentUser;
		const adminRole = user.profile.congregation!.cong_role.includes('admin');

		if (!adminRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to send congregation backup';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const cong_backup = req.body.cong_backup as BackupData;

		cong.saveBackup(cong_backup);

		const userSettings = cong_backup.app_settings.user_settings;
		if (userSettings) {
			user.saveBackup(userSettings);
		}

		res.locals.type = 'info';
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
	} catch (err) {
		next(err);
	}
};

export const getCountries = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const language = (req.query.language as string) || 'E';

		const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language });

		const response = await fetch(url);

		if (!response.ok) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting list of all countries';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
			return;
		}

		const countriesList = await response.json();
		res.locals.type = 'info';
		res.locals.message = 'user fetched all countries';
		res.status(200).json(countriesList);
	} catch (err) {
		next(err);
	}
};

export const getCongregations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const language = (req.query.language as string) || 'E';
		const name = req.query.name as string;
		let country = req.query.country as string;

		if (name.length < 2 || country?.length === 0) {
			res.locals.type = 'warn';
			res.locals.message = `country or name is invalid`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		country = country.toUpperCase();

		const url = process.env.APP_CONGREGATION_API! + new URLSearchParams({ country, language, name });

		const response = await fetch(url);

		if (!response.ok) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while getting congregations list';
			res.status(response.status).json({ message: 'FETCH_FAILED' });
			return;
		}

		const congsList = await response.json();

		res.locals.type = 'info';
		res.locals.message = 'user fetched congregations';
		res.status(200).json(congsList);
	} catch (err) {
		next(err);
	}
};

export const createCongregation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const msg = formatError(errors);

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const country_code = req.body.country_code as string;
		const cong_name = req.body.cong_name as string;
		const cong_number = req.body.cong_number as string;
		const firstname = req.body.firstname as string;
		const lastname = req.body.lastname as string;

		// find congregation
		const cong = CongregationsList.findByCountryAndNumber(country_code, cong_number);
		if (cong) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation requested already exists';
			res.status(404).json({ message: 'CONG_EXISTS' });

			return;
		}

		// is congregation authentic
		const language = (req.headers.language as string) || 'E';
		const url = process.env.APP_CONGREGATION_API! + new URLSearchParams({ country: country_code, language, name: cong_number });

		const response = await fetch(url);
		if (response.status !== 200) {
			res.locals.type = 'warn';
			res.locals.message = 'an error occured while verifying the congregation data';
			res.status(response.status).json({ message: 'REQUEST_NOT_VALIDATED' });

			return;
		}

		const congsList = (await response.json()) as [];
		let isValidCong = true;

		if (congsList.length === 0) {
			isValidCong = false;
		}

		if (congsList.length > 0) {
			const tmpCong = congsList.at(0)! as ApiCongregationSearchResponse;
			if (tmpCong.congName !== cong_name || tmpCong.congNumber !== cong_number) {
				isValidCong = false;
			}
		}

		if (!isValidCong) {
			res.locals.type = 'warn';
			res.locals.message = 'this request does not match any valid congregation';
			res.status(400).json({ message: 'BAD_REQUEST' });

			return;
		}

		// update user details
		const user = res.locals.currentUser;

		const profile = structuredClone(user.profile);
		profile.firstname = { value: firstname, updatedAt: new Date().toISOString() };
		profile.lastname = { value: lastname, updatedAt: new Date().toISOString() };

		await user.updateProfile(profile);

		// create congregation
		const congRequest = congsList.at(0)! as ApiCongregationSearchResponse;

		const congId = await CongregationsList.create({
			cong_name,
			cong_number,
			country_code,
			cong_circuit: congRequest.circuit,
			cong_location: { address: congRequest.address, lat: congRequest.location.lat, lng: congRequest.location.lng },
			midweek_meeting: {
				time: congRequest.midweekMeetingTime.time.slice(0, -3),
				weekday: congRequest.midweekMeetingTime.weekday,
			},
			weekend_meeting: {
				time: congRequest.weekendMeetingTime.time.slice(0, -3),
				weekday: congRequest.weekendMeetingTime.weekday,
			},
		});

		// add user to congregation
		const userCong = await user.assignCongregation({ congId: congId, role: ['admin'] });

		if (!isDev) {
			sendWelcomeMessage(user.profile.email!, `${lastname} ${firstname}`, `${cong_name} (${cong_number})`, language);
		}

		const finalResult = {
			user_id: user.id,
			cong_id: userCong.id,
			firstname: user.profile.firstname.value,
			lastname: user.profile.lastname.value,
			cong_settings: userCong.settings,
		};

		res.locals.type = 'info';
		res.locals.message = 'congregation created successfully';
		res.status(200).json(finalResult);
	} catch (err) {
		next(err);
	}
};

export const retrieveCongregationBackup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = res.locals.currentUser;
		const result = {} as BackupData;

		if (cong.settings.data_sync.value) {
			const masterKeyNeed = user.profile.congregation!.cong_role.some((role) => ROLE_MASTER_KEY.includes(role));

			const adminRole = user.profile.congregation!.cong_role.includes('admin');

			const personEditor = adminRole;
			const publicTalkEditor = adminRole;

			result.app_settings = {
				cong_settings: structuredClone(cong.settings),
				user_settings: {
					cong_role: user.profile.congregation?.cong_role,
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					user_local_uid: user.profile.congregation?.user_local_uid,
					user_members_delegate: user.profile.congregation?.user_members_delegate,
					backup_automatic: user.settings.backup_automatic?.length > 0 ? user.settings.backup_automatic : undefined,
					theme_follow_os_enabled:
						user.settings.theme_follow_os_enabled?.length > 0 ? user.settings.theme_follow_os_enabled : undefined,
					hour_credits_enabled: user.settings.hour_credits_enabled?.length > 0 ? user.settings.hour_credits_enabled : undefined,
					data_view: user.settings.data_view?.length > 0 ? user.settings.data_view : undefined,
				},
			};

			if (!masterKeyNeed) {
				result.app_settings.cong_settings.cong_master_key = '';
			}

			if (personEditor) {
				result.persons = cong.persons;
			}

			if (publicTalkEditor) {
				result.speakers_key = cong.outgoing_speakers.speakers_key;
				result.speakers_congregations = cong.speakers_congregations;
				result.visiting_speakers = cong.visiting_speakers;
				result.outgoing_talks =
					cong.public_schedules.incoming_talks === '' ? [] : JSON.parse(cong.public_schedules.incoming_talks);
			}
		}

		if (!cong.settings.data_sync.value) {
			const masterKeyNeed = user.profile.congregation!.cong_role.some((role) => ROLE_MASTER_KEY.includes(role));

			const midweek = cong.settings.midweek_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			const weekend = cong.settings.weekend_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			result.app_settings = {
				cong_settings: {
					cong_access_code: cong.settings.cong_access_code,
					cong_master_key: masterKeyNeed ? cong.settings.cong_master_key : undefined,
					cong_circuit: cong.settings.cong_circuit,
					cong_discoverable: cong.settings.cong_discoverable,
					cong_location: cong.settings.cong_location,
					data_sync: cong.settings.data_sync,
					midweek_meeting: midweek,
					weekend_meeting: weekend,
					cong_name: cong.settings.cong_name,
					cong_number: cong.settings.cong_number,
					country_code: cong.settings.country_code,
					last_backup: cong.settings.last_backup,
				},
				user_settings: {
					cong_role: user.profile.congregation?.cong_role,
					firstname: user.profile.firstname,
					lastname: user.profile.lastname,
					user_local_uid: user.profile.congregation?.user_local_uid,
					user_members_delegate: user.profile.congregation?.user_members_delegate,
				},
			};
		}

		res.locals.type = 'info';
		res.locals.message = 'user retrieve backup successfully';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const getCongregationUpdates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = res.locals.currentUser;

		const roles = user.profile.congregation!.cong_role;
		const masterKeyNeed = roles.some((role) => ROLE_MASTER_KEY.includes(role));

		const adminRole = roles.includes('admin');
		const coordinatorRole = roles.includes('coordinator');
		const secretaryRole = roles.includes('secretary');
		const serviceRole = roles.includes('service_overseer');

		const committeeRole = adminRole || coordinatorRole || secretaryRole || serviceRole;

		const publicTalkEditor = adminRole;

		const result: CongregationUpdatesType = {
			cong_access_code: cong.settings.cong_access_code,
		};

		if (masterKeyNeed) {
			result.cong_master_key = cong.settings.cong_master_key;
		}

		if (committeeRole) {
			result.applications = cong.ap_applications;
		}

		if (publicTalkEditor) {
			result.speakers_key = cong.outgoing_speakers.speakers_key;
			result.pending_speakers_requests = cong.getPendingVisitingSpeakersAccessList();
			result.remote_congregations = cong.getRemoteCongregationsList();
			result.rejected_requests = cong.getRejectedRequests();
		}

		res.locals.type = 'info';
		res.locals.message = 'user retrieve updates successfully';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const updateApplicationApproval = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id, request } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		if (!request) {
			res.locals.type = 'warn';
			res.locals.message = 'the application request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = res.locals.currentUser;

		const roles = user.profile.congregation!.cong_role;

		const adminRole = roles.includes('admin');
		const coordinatorRole = roles.includes('coordinator');
		const secretaryRole = roles.includes('secretary');
		const serviceRole = roles.includes('service_overseer');

		const committeeRole = adminRole || coordinatorRole || secretaryRole || serviceRole;

		if (!committeeRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to process this application';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const application = req.body.application as StandardRecord;

		await cong.saveApplication(application);

		const result = cong.ap_applications;

		res.locals.type = 'info';
		res.locals.message = 'user updated application approval';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};

export const deleteApplication = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id, request } = req.params;

		if (!id) {
			res.locals.type = 'warn';
			res.locals.message = 'the congregation request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		if (!request) {
			res.locals.type = 'warn';
			res.locals.message = 'the application request id params is undefined';
			res.status(400).json({ message: 'REQUEST_ID_INVALID' });
			return;
		}

		const cong = CongregationsList.findById(id);

		if (!cong) {
			res.locals.type = 'warn';
			res.locals.message = 'no congregation could not be found with the provided id';
			res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
			return;
		}

		const isValid = cong.hasMember(res.locals.currentUser.profile.auth_uid!);

		if (!isValid) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to access the provided congregation';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const user = res.locals.currentUser;

		const roles = user.profile.congregation!.cong_role;

		const adminRole = roles.includes('admin');
		const coordinatorRole = roles.includes('coordinator');
		const secretaryRole = roles.includes('secretary');
		const serviceRole = roles.includes('service_overseer');

		const committeeRole = adminRole || coordinatorRole || secretaryRole || serviceRole;

		if (!committeeRole) {
			res.locals.type = 'warn';
			res.locals.message = 'user not authorized to process this application';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
			return;
		}

		const result = await cong.deleteApplication(request);

		res.locals.type = 'info';
		res.locals.message = 'user deleted application';
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
};
