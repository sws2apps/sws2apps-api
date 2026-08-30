import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';

import { UsersList } from './users.js';
import { CongregationsList } from '../congregations/congregations.js';
import { formatError } from '../../http/validation-errors.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type { BackupData } from '../backups/backup.types.js';
import { CongregationUpdatesType } from '../congregations/congregations.types.js';
import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { getCongregationJoinRequests } from '../congregations/congregation-join-requests.service.js';
import {
	retrieveUserBackup as retrieveUserBackupData,
	saveUserBackup as saveUserBackupData,
	saveUserChunkedBackup as saveUserChunkedBackupData,
} from './users-backup.service.js';
import { sendFeedbackEmail } from './user-notifications.service.js';
import {
	deleteUserAccount,
	disableUserMfa,
	getUserActiveSessions,
	getUserMfaEnrollment,
	getValidatedUserAccount,
	logoutUserSession,
	revokeUserSession,
	UserAccountError,
} from './users-account.service.js';
import {
	getUserAuxiliaryApplications,
	submitUserAuxiliaryApplication,
	submitUserFieldServiceReport,
	UserCongregationActivityError,
} from './users-congregation-activity.service.js';

const handleUserCongregationActivityError = (
	error: unknown,
	res: Response,
): boolean => {
	if (!(error instanceof UserCongregationActivityError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		res.locals.message = 'user does not have an assigned congregation';
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });
		return true;
	}

	res.locals.message = 'user congregation is invalid';
	res.status(404).json({ message: 'error_app_congregation_not-found' });
	return true;
};

export const validateUser = async (req: Request, res: Response) => {
	try {
		const account = getValidatedUserAccount(res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'visitor id has been validated';
		res.status(200).json(account);
	} catch (error) {
		if (!(error instanceof UserAccountError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'email address not associated with a congregation'
			: 'user congregation is invalid';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
	}
};

export const getUserSecretToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const enrollment = await getUserMfaEnrollment(id);

	res.locals.type = 'info';
	res.locals.message = `the user has fetched 2fa successfully`;

	res.status(200).json(enrollment);
};

export const getUserSessions = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const sessions = getUserActiveSessions(id, req.signedCookies.visitorid);

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

	const sessions = await revokeUserSession(id, identifier);

	res.locals.type = 'info';
	res.locals.message = `the user has revoked session successfully`;
	res.status(200).json(sessions);
};

export const userLogout = async (req: Request, res: Response) => {
	const visitorid = req.headers.visitorid as string;

	await logoutUserSession(res.locals.currentUser?.id, visitorid);

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

	await disableUserMfa(id);

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

	let results;

	try {
		results = getUserAuxiliaryApplications(id);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

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

	try {
		submitUserAuxiliaryApplication(id, req.body.application as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

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

	try {
		submitUserFieldServiceReport(id, req.body.report as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

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

	const result = await retrieveUserBackupData(user, cong, req.headers.metadata!.toString());

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

	const cong_backup = req.body.cong_backup as BackupData;

	const outcome = await saveUserBackupData(user, cong, cong_backup);

	if (outcome.status === 'conflict') {
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(400).json({ message: 'BACKUP_OUTDATED' });

		return;
	}

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
	const masterKeyNeed = canAccessCongregationMasterKey(roles);

	const adminRole = roles.includes('admin');
	const secretaryRole = roles.includes('secretary');
	const elderRole = roles.includes('elder');
	const coordinatorRole = roles.includes('coordinator');
	const serviceOverseerRole = roles.includes('service_overseer');
	const serviceCommittee = adminRole || coordinatorRole || secretaryRole || serviceOverseerRole;
	const languageGroupOverseerRole = adminRole || roles.includes('language_group_overseers');
	const publicTalkEditor = languageGroupOverseerRole || roles.includes('public_talk_schedule');

	const result: CongregationUpdatesType = {
		cong_access_code: cong.settings.cong_access_code,
	};

	if (masterKeyNeed) {
		result.cong_master_key = cong.settings.cong_master_key;
	}

	if (serviceCommittee || elderRole) {
		result.applications = cong.ap_applications;
	}

	if (publicTalkEditor && cong.settings.data_sync.value) {
		result.speakers_key = cong.outgoing_speakers.speakers_key;
		result.pending_speakers_requests = cong.getPendingVisitingSpeakersAccessList();
		result.remote_congregations = cong.getRemoteCongregationsList();
		result.rejected_requests = cong.getRejectedRequests();
	}

	if (secretaryRole) {
		result.incoming_reports = cong.incoming_reports;

		if (result.incoming_reports.length > 0) {
			await cong.saveIncomingReports([]);
		}
	}

	if (adminRole) {
		result.join_requests = getCongregationJoinRequests(cong);
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

	sendFeedbackEmail({
		replyTo: user.email,
		subject: cleanSubject,
		message: cleanMessage,
	});

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

	await deleteUserAccount(id);

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};

export const joinCongregation = async (req: Request, res: Response) => {
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
		res.locals.message = `invalid input: user id are required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const user = UsersList.findById(id)!;

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = `no user account found with the provided id`;
		res.status(404).json({ message: 'USER_NOT_FOUND' });

		return;
	}

	const country_code = req.body.country_code as string;
	const cong_name = req.body.cong_name as string;
	const firstname = req.body.firstname as string;
	const lastname = (req.body.lastname || '') as string;

	const cong = CongregationsList.findByCountryAndName(country_code, cong_name);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = `congregation not yet available in the records`;
		res.status(200).json({ message: 'REQUEST_SENT' });

		return;
	}

	const isMember = cong.hasMember(id);

	if (isMember) {
		res.locals.type = 'warn';
		res.locals.message = `user already member of the congregation`;
		res.status(400).json({ message: 'ALREADY_MEMBER' });

		return;
	}

	const userFirstname = user.profile.firstname.value;
	const userLastname = user.profile.lastname.value;

	if (firstname !== userFirstname || lastname !== userLastname) {
		const profile = structuredClone(user.profile);
		profile.lastname.value = lastname;
		profile.firstname.value = firstname;

		await user.updateProfile(profile);
	}

	await cong.join(id);

	res.locals.type = 'info';
	res.locals.message = `user request to join a congregation`;
	res.status(200).json({ message: 'REQUEST_SENT' });
};

export const saveUserChunkedBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

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

	const uploadId = req.body.uploadId as string;
	const chunkIndex = req.body.chunkIndex as number;
	const chunkData = req.body.chunkData as string;
	const totalChunks = req.body.totalChunks as number;

	if (!uploadId || chunkIndex == null || !chunkData || !totalChunks) {
		res.locals.type = 'warn';
		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const outcome = await saveUserChunkedBackupData(user, cong, req.headers.metadata!.toString(), {
		uploadId,
		chunkIndex,
		chunkData,
		totalChunks,
	});

	if (outcome.status === 'metadata_conflict') {
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	if (outcome.status === 'backup_in_progress') {
		res.locals.type = 'warn';
		res.locals.message = 'congregation already has a backup in progress';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	res.locals.type = 'info';
	if (outcome.status === 'saved') {
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
		return;
	}

	res.locals.message = 'congregation backup chunk processed';
	res.status(200).json({ message: 'BACKUP_CHUNK_RECEIVED' });
};
