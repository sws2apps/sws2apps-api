import sanitizeHtml from 'sanitize-html';
import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import type { StandardRecord } from '../../../types/standard-record.js';
import {
	getCongregationJoinRequests,
	requestCongregationMembership as saveCongregationMembershipRequest,
	CongregationsList,
	saveCongregationApplication,
	type CongregationUpdatesType,
	getPendingOutgoingSpeakerAccess,
	getRejectedSpeakerRequests,
	getRemoteSpeakerCongregations,
	isCongregationMember,
	getCongregationPersons,
	saveCongregationIncomingReports,
	saveCongregationPersons,
} from '#modules/congregations/index.js';
import { sendFeedbackEmail } from './user-notifications.service.js';
import { UsersList } from '../users.js';
import { updateUserProfile } from './user-data.service.js';


export type UserCongregationActivityErrorCode =
	| 'USER_NOT_FOUND'
	| 'CONGREGATION_NOT_ASSIGNED'
	| 'CONGREGATION_NOT_FOUND';

export class UserCongregationActivityError extends Error {
	constructor(public readonly code: UserCongregationActivityErrorCode) {
		super(code);
		this.name = 'UserCongregationActivityError';
	}
}

export type UserCongregationSubmissionOperations = {
	saveApplication: typeof saveCongregationApplication;
	saveIncomingReports: typeof saveCongregationIncomingReports;
	createRequestId: () => string;
	getCurrentTimestamp: () => string;
};

const defaultSubmissionOperations: UserCongregationSubmissionOperations = {
	saveApplication: (congregation, application) => {
		return saveCongregationApplication(congregation, application);
	},
	saveIncomingReports: (congregation, reports) => {
		return saveCongregationIncomingReports(congregation, reports);
	},
	createRequestId: () => crypto.randomUUID().toUpperCase(),
	getCurrentTimestamp: () => new Date().toISOString(),
};

const getUserCongregation = (userId: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new UserCongregationActivityError('USER_NOT_FOUND');

	const membership = user.profile.congregation;
	const congregationId = membership?.id;

	if (!congregationId) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_ASSIGNED');
	}

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_FOUND');
	}

	return { user, congregation, membership };
};

export const getUserAuxiliaryApplications = (userId: string) => {
	const { congregation, membership } = getUserCongregation(userId);
	const personId = membership.user_local_uid;

	return congregation.ap_applications.filter((application) => application.person_uid === personId);
};

export const submitUserAuxiliaryApplication = async (
	userId: string,
	applicationForm: StandardRecord,
	operations: Partial<UserCongregationSubmissionOperations> = {},
): Promise<void> => {
	const submission = { ...defaultSubmissionOperations, ...operations };
	const { congregation, membership } = getUserCongregation(userId);
	const application = {
		request_id: submission.createRequestId(),
		person_uid: membership.user_local_uid,
		months: applicationForm.months,
		continuous: applicationForm.continuous,
		submitted: applicationForm.submitted,
		updatedAt: submission.getCurrentTimestamp(),
		expired: null,
	};

	await submission.saveApplication(congregation, application);
};

export const submitUserFieldServiceReport = async (
	userId: string,
	report: StandardRecord,
	operations: Pick<Partial<UserCongregationSubmissionOperations>, 'saveIncomingReports'> = {},
): Promise<void> => {
	const { congregation } = getUserCongregation(userId);
	await saveIncomingFieldServiceReport(congregation, report, operations);
};

const saveIncomingFieldServiceReport = async (
	congregation: ReturnType<typeof getUserCongregation>['congregation'],
	report: StandardRecord,
	operations: Pick<Partial<UserCongregationSubmissionOperations>, 'saveIncomingReports'> = {},
): Promise<void> => {
	const { saveIncomingReports } = { ...defaultSubmissionOperations, ...operations };
	const incomingReports = mergeIncomingFieldServiceReport(
		congregation.incoming_reports,
		report,
	);

	await saveIncomingReports(congregation, incomingReports);
};

export const mergeIncomingFieldServiceReport = (
	currentReports: StandardRecord[],
	report: StandardRecord,
	createReportId: () => string = () => crypto.randomUUID(),
): StandardRecord[] => {
	const incomingReports = structuredClone(currentReports);
	const currentReport = incomingReports.find((record) => {
		return record.report_month === report.report_month && record.person_uid === report.person_uid;
	});

	if (!currentReport) {
		incomingReports.push({ ...report, report_id: createReportId() });
	} else {
		currentReport._deleted = report._deleted;
		currentReport.updatedAt = report.updatedAt;
		currentReport.shared_ministry = report.shared_ministry;
		currentReport.hours = report.hours;
		currentReport.hours_credits = report.hours;
		currentReport.bible_studies = report.bible_studies;
		currentReport.comments = report.comments;
	}

	return incomingReports;
};

export const updateUserCongregationPersonData = async (
	userId: string,
	timeAway: string,
	emergencyContacts: string,
): Promise<void> => {
	const { congregation, membership } = getUserCongregation(userId);
	const persons = await getCongregationPersons(congregation.id);
	const person = persons.find((record) => {
		return record.person_uid === membership.user_local_uid;
	});

	if (!person) return;

	const personData = person.person_data as StandardRecord;
	personData.timeAway = timeAway;
	personData.emergency_contacts = emergencyContacts;

	await saveCongregationPersons(congregation, persons);
};

export const getUserCongregationUpdates = async (
	userId: string,
): Promise<CongregationUpdatesType> => {
	const { congregation, membership } = getUserCongregation(userId);
	const roles = membership.cong_role;
	const isAdmin = roles.includes('admin');
	const isSecretary = roles.includes('secretary');
	const isElder = roles.includes('elder');
	const isServiceCommitteeMember =
		isAdmin ||
		roles.includes('coordinator') ||
		isSecretary ||
		roles.includes('service_overseer');
	const canEditPublicTalks =
		isAdmin ||
		roles.includes('language_group_overseers') ||
		roles.includes('public_talk_schedule');

	const updates: CongregationUpdatesType = {
		cong_access_code: congregation.settings.cong_access_code,
	};

	if (canAccessCongregationMasterKey(roles)) {
		updates.cong_master_key = congregation.settings.cong_master_key;
	}

	if (isServiceCommitteeMember || isElder) {
		updates.applications = congregation.ap_applications;
	}

	if (canEditPublicTalks && congregation.settings.data_sync.value) {
		updates.speakers_key = congregation.outgoing_speakers.speakers_key;
		updates.pending_speakers_requests = getPendingOutgoingSpeakerAccess(congregation, CongregationsList.list);
		updates.remote_congregations = getRemoteSpeakerCongregations(congregation, CongregationsList.list);
		updates.rejected_requests = getRejectedSpeakerRequests(congregation, CongregationsList.list);
	}

	if (isSecretary) {
		updates.incoming_reports = congregation.incoming_reports;

		if (updates.incoming_reports.length > 0) {
			await saveCongregationIncomingReports(congregation, []);
		}
	}

	if (isAdmin) {
		updates.join_requests = getCongregationJoinRequests(congregation);
	}

	return updates;
};

export const submitUserFeedback = (
	userId: string,
	subject: string,
	message: string,
) => {
	const { user } = getUserCongregation(userId);

	sendFeedbackEmail({
		replyTo: user.email,
		subject: sanitizeHtml(subject),
		message: sanitizeHtml(message),
	});
};

type JoinCongregationRequest = {
	countryCode: string;
	congregationName: string;
	firstname: string;
	lastname: string;
};

export const requestCongregationMembership = async (
	userId: string,
	request: JoinCongregationRequest,
): Promise<'request_sent' | 'already_member'> => {
	const user = UsersList.findById(userId);
	if (!user) throw new UserCongregationActivityError('USER_NOT_FOUND');

	const congregation = CongregationsList.findByCountryAndName(
		request.countryCode,
		request.congregationName,
	);

	if (!congregation) return 'request_sent';
	if (isCongregationMember(congregation, userId)) return 'already_member';

	const currentFirstname = user.profile.firstname.value;
	const currentLastname = user.profile.lastname.value;

	if (request.firstname !== currentFirstname || request.lastname !== currentLastname) {
		const profile = structuredClone(user.profile);
		profile.firstname.value = request.firstname;
		profile.lastname.value = request.lastname;
		await updateUserProfile(user, profile);
	}

	await saveCongregationMembershipRequest(congregation, userId);
	return 'request_sent';
};
