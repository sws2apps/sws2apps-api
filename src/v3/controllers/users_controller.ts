import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';

import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { generateTokenDev } from '../dev/setup.js';
import { formatError } from '../utils/format_log.js';
import { StandardRecord } from '../definition/app.js';
import { BackupData, CongregationUpdatesType } from '../definition/congregation.js';
import { ROLE_MASTER_KEY } from '../constant/base.js';
import { MailClient } from '../config/mail_config.js';

const isDev = process.env.NODE_ENV === 'development';

export const validateUser = async (req: Request, res: Response) => {
	const user = res.locals.currentUser;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = 'email address not associated with a congregation';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation.id)!;

	const userRole = user.profile.congregation.cong_role;
	const masterKeyNeeded = userRole.some((role) => ROLE_MASTER_KEY.includes(role));

	const obj = {
		id: user.id,
		mfa: user.profile.mfa_enabled,
		cong_id: cong.id,
		country_code: cong.settings.country_code,
		cong_name: cong.settings.cong_name,
		cong_number: cong.settings.cong_number,
		cong_role: user.profile.congregation.cong_role,
		user_local_uid: user.profile.congregation.user_local_uid,
		user_delegates: user.profile.congregation.user_members_delegate,
		cong_master_key: masterKeyNeeded ? cong.settings.cong_master_key : undefined,
		cong_access_code: cong.settings.cong_access_code,
	};

	res.locals.type = 'info';
	res.locals.message = 'visitor id has been validated';
	res.status(200).json(obj);
};

export const getUserSecretToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;
	await user.generateSecret();
	const { secret, uri } = user.decryptSecret();

	res.locals.type = 'info';
	res.locals.message = `the user has fetched 2fa successfully`;

	if (!user.profile.mfa_enabled && isDev) {
		const tokenDev = generateTokenDev(user.email!, user.profile.secret!);
		res.status(200).json({ secret: secret, qrCode: uri, mfaEnabled: user.profile.mfa_enabled, MFA_CODE: tokenDev });
	} else {
		res.status(200).json({
			secret: secret,
			qrCode: uri,
			mfaEnabled: user.profile.mfa_enabled,
		});
	}
};

export const getUserSessions = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const user = UsersList.findById(id)!;
	const sessions = user.getActiveSessions(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = `the user has fetched sessions successfully`;
	res.status(200).json(sessions);
};

export const deleteUserSession = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user and session id are required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const identifier = req.body.identifier as string;

	const user = UsersList.findById(id)!;
	const sessions = await user.revokeSession(identifier);

	if (user.profile.congregation && user.profile.congregation.id.length > 0) {
		const cong = CongregationsList.findById(user.profile.congregation.id);

		if (cong) {
			cong.reloadMembers();
		}
	}

	res.locals.type = 'info';
	res.locals.message = `the user has revoked session successfully`;
	res.status(200).json(sessions);
};

export const userLogout = async (req: Request, res: Response) => {
	const visitorid = req.headers.visitorid as string;

	const user = res.locals.currentUser;

	if (user) {
		await user.revokeSession(visitorid);
	}

	res.locals.type = 'info';
	res.locals.message = `the current user has logged out`;

	res.clearCookie('visitorid', { path: '/' });
	res.status(200).json({ message: 'OK' });
};

export const disableUser2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;
	await user.disableMFA();

	res.locals.type = 'info';
	res.locals.message = `the user disabled 2fa successfully`;
	res.status(200).json({ message: 'MFA_DISABLED' });
};

export const getAuxiliaryApplications = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const results = user.getApplications();

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitAuxiliaryApplication = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const form = req.body.application as StandardRecord;

	const application = {
		request_id: crypto.randomUUID().toUpperCase(),
		person_uid: user.profile.congregation.user_local_uid,
		months: form.months,
		continuous: form.continuous,
		submitted: form.submitted,
		updatedAt: new Date().toISOString(),
		expired: null,
	};

	cong.saveApplication(application);

	res.locals.type = 'info';
	res.locals.message = `user submitted auxiliary pioneer application`;
	res.status(200).json({ message: 'APPLICATION_SENT' });
};

export const postUserReport = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const report = req.body.report as StandardRecord;
	user.postReport(report);

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const result = {} as BackupData;

	const userRole = user.profile.congregation!.cong_role;

	const masterKeyNeed = userRole.some((role) => ROLE_MASTER_KEY.includes(role));

	const secretaryRole = userRole.includes('secretary');
	const coordinatorRole = userRole.includes('coordinator');
	const adminRole = userRole.includes('admin') || secretaryRole || coordinatorRole;

	const elderRole = userRole.includes('elder');

	const scheduleEditor =
		adminRole ||
		userRole.some((role) => role === 'midweek_schedule' || role === 'weekend_schedule' || role === 'public_talk_schedule');

	const personViewer = scheduleEditor || elderRole;

	const publicTalkEditor = adminRole || userRole.some((role) => role === 'public_talk_schedule');

	const attendanceTracker = adminRole || userRole.some((role) => role === 'attendance_tracking');

	const isPublisher = userRole.includes('publisher');

	const personMinimal = !personViewer;
	const userUid = user.profile.congregation!.user_local_uid;

	if (cong.settings.data_sync.value) {
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
			result.app_settings.cong_settings.cong_master_key = undefined;
		}

		if (personViewer) {
			result.persons = cong.persons;
		}

		if (adminRole || elderRole) {
			result.speakers_congregations = cong.speakers_congregations;
			result.visiting_speakers = cong.visiting_speakers;
			result.cong_field_service_reports = cong.field_service_reports;
		}

		if (publicTalkEditor) {
			result.speakers_key = cong.outgoing_speakers.speakers_key;
			result.outgoing_talks = cong.public_schedules.incoming_talks === '' ? [] : JSON.parse(cong.public_schedules.incoming_talks);
		}

		if (isPublisher) {
			result.user_bible_studies = user.bible_studies;
			result.user_field_service_reports = user.field_service_reports;
			result.field_service_groups = cong.field_service_groups;

			if (!result.cong_field_service_reports && user.profile.congregation.user_local_uid) {
				const congUserReports = cong.field_service_reports.filter((record) => {
					const data = record.report_data as StandardRecord;

					return data.person_uid === user.profile.congregation!.user_local_uid;
				});

				result.cong_field_service_reports = congUserReports;
			}
		}

		if (personMinimal) {
			const minimalPersons = cong.persons.map((record) => {
				const includeTimeAway = cong.settings.time_away_public?.value ?? false;

				const personData = record.person_data as StandardRecord;

				return {
					_deleted: record._deleted,
					person_uid: record.person_uid,
					person_data: {
						person_firstname: personData.person_firstname,
						person_lastname: personData.person_lastname,
						person_display_name: personData.person_display_name,
						male: personData.male,
						female: personData.female,
						publisher_unbaptized: userUid === record.person_uid ? personData.publisher_unbaptized : undefined,
						publisher_baptized: userUid === record.person_uid ? personData.publisher_baptized : undefined,
						emergency_contacts: userUid === record.person_uid ? personData.emergency_contacts : undefined,
						assignments: userUid === record.person_uid ? personData.assignments : undefined,
						privileges: userUid === record.person_uid ? personData.privileges : undefined,
						enrollments: userUid === record.person_uid ? personData.enrollments : undefined,
						timeAway: includeTimeAway || userUid === record.person_uid ? personData.timeAway : undefined,
					},
				};
			});

			result.persons = minimalPersons;

			result.public_sources = cong.public_schedules.sources.length === 0 ? [] : JSON.parse(cong.public_schedules.sources);

			result.public_schedules = cong.public_schedules.schedules.length === 0 ? [] : JSON.parse(cong.public_schedules.schedules);
		}

		if (scheduleEditor || elderRole) {
			result.sources = cong.sources;
			result.sched = cong.schedules;
		}

		if (attendanceTracker) {
			result.meeting_attendance = cong.meeting_attendance;
		}

		if (secretaryRole) {
			result.incoming_reports = cong.incoming_reports;
		}

		if (adminRole) {
			result.branch_cong_analysis = cong.branch_cong_analysis;
			result.branch_field_service_reports = cong.branch_field_service_reports;
			result.cong_users = cong.members.map((user) => {
				return {
					id: user.id,
					local_uid: user.profile.congregation?.user_local_uid,
					role: user.profile.congregation?.cong_role,
				};
			});
		}
	}

	if (!cong.settings.data_sync.value) {
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
				time_away_public: cong.settings.time_away_public,
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
};

export const saveUserBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const last_backup = req.headers.lastbackup as string;

	if (last_backup !== cong.settings.last_backup) {
		res.locals.type = 'info';
		res.locals.message = 'backup action rejected since it was changed recently';
		res.status(400).json({ message: 'BACKUP_OUTDATED' });
		return;
	}

	const userRole = user.profile.congregation!.cong_role;

	const adminRole = userRole.some((role) => role === 'admin' || role === 'coordinator' || role === 'secretary');

	const scheduleEditor = userRole.some(
		(role) => role === 'midweek_schedule' || role === 'weekend_schedule' || role === 'public_talk_schedule'
	);

	const cong_backup = req.body.cong_backup as BackupData;

	cong.saveBackup(cong_backup, userRole);

	const userPerson = cong_backup.persons?.at(0);

	if (!adminRole && !scheduleEditor && userPerson) {
		const personData = userPerson.person_data as StandardRecord;
		user.updatePersonData(personData.timeAway as string, personData.emergency_contacts as string);
	}

	user.saveBackup(cong_backup, userRole);

	res.locals.type = 'info';
	res.locals.message = 'user send backup for congregation successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getUserUpdates = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(403).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(403).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const roles = user.profile.congregation!.cong_role;
	const masterKeyNeed = roles.some((role) => ROLE_MASTER_KEY.includes(role));

	const adminRole = roles.includes('admin');
	const secretaryRole = roles.includes('secretary');
	const elderRole = roles.includes('elder');
	const coordinatorRole = roles.includes('coordinator');
	const serviceOverseerRole = roles.includes('service_overseer');
	const serviceCommittee = adminRole || coordinatorRole || secretaryRole || serviceOverseerRole;
	const publicTalkEditor = adminRole || roles.includes('public_talk_schedule');

	const result: CongregationUpdatesType = {
		cong_access_code: cong.settings.cong_access_code,
	};

	if (masterKeyNeed) {
		result.cong_master_key = cong.settings.cong_master_key;
	}

	if (serviceCommittee || elderRole) {
		result.applications = cong.ap_applications;
	}

	if (publicTalkEditor) {
		result.speakers_key = cong.outgoing_speakers.speakers_key;
		result.pending_speakers_requests = cong.getPendingVisitingSpeakersAccessList();
		result.remote_congregations = cong.getRemoteCongregationsList();
		result.rejected_requests = cong.getRejectedRequests();
	}

	if (secretaryRole) {
		result.incoming_reports = cong.incoming_reports;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve updates successfully';
	res.status(200).json(result);
};

export const userPostFeedback = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;

	if (!user.profile.congregation) {
		res.locals.type = 'warn';
		res.locals.message = `user does not have an assigned congregation`;
		res.status(403).json({ message: 'CONG_NOT_ASSIGNED' });

		return;
	}

	const cong = CongregationsList.findById(user.profile.congregation?.id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'user congregation is invalid';
		res.status(403).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const { subject, message } = req.body;

	const cleanSubject = sanitizeHtml(subject);
	const cleanMessage = sanitizeHtml(message);

	const options = {
		to: 'support@organized-app.com',
		replyTo: user.email,
		subject: `Feedback: ${cleanSubject}`,
		template: 'feedback',
		context: {
			message: cleanMessage,
		},
	};

	MailClient.sendEmail(options, 'Feedback sent successfully to support team');

	res.locals.type = 'info';
	res.locals.message = 'user sent feedback successfully';
	res.status(200).json({ message: 'MESSAGE_SENT' });
};

export const deleteUser = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id)!;
	const congId = user.profile.congregation?.id;

	await UsersList.delete(id);

	if (congId) {
		const cong = CongregationsList.findById(congId);
		cong?.reloadMembers();
	}

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};
