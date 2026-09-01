import sanitizeHtml from 'sanitize-html';
import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import type { StandardRecord } from '../../types/standard-record.js';
import {
	getCongregationJoinRequests,
	requestCongregationMembership as saveCongregationMembershipRequest,
} from '#modules/congregations/index.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { saveCongregationApplication } from '#modules/congregations/index.js';
import type { CongregationUpdatesType } from '#modules/congregations/index.js';
import { sendFeedbackEmail } from './user-notifications.service.js';
import { UsersList } from './users.js';
import {
	getPendingOutgoingSpeakerAccess,
	getRejectedSpeakerRequests,
	getRemoteSpeakerCongregations,
} from '#modules/congregations/index.js';
import { isCongregationMember } from '#modules/congregations/index.js';

export type UserCongregationActivityErrorCode =
	| 'CONGREGATION_NOT_ASSIGNED'
	| 'CONGREGATION_NOT_FOUND';

export class UserCongregationActivityError extends Error {
	constructor(public readonly code: UserCongregationActivityErrorCode) {
		super(code);
		this.name = 'UserCongregationActivityError';
	}
}

const getUserCongregation = (userId: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	if (!congregationId) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_ASSIGNED');
	}

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) {
		throw new UserCongregationActivityError('CONGREGATION_NOT_FOUND');
	}

	return { user, congregation };
};

export const getUserAuxiliaryApplications = (userId: string) => {
	const { user, congregation } = getUserCongregation(userId);
	const personId = user.profile.congregation!.user_local_uid;

	return congregation.ap_applications.filter((application) => application.person_uid === personId);
};

export const submitUserAuxiliaryApplication = (
	userId: string,
	applicationForm: StandardRecord,
) => {
	const { user, congregation } = getUserCongregation(userId);
	const application = {
		request_id: crypto.randomUUID().toUpperCase(),
		person_uid: user.profile.congregation!.user_local_uid,
		months: applicationForm.months,
		continuous: applicationForm.continuous,
		submitted: applicationForm.submitted,
		updatedAt: new Date().toISOString(),
		expired: null,
	};

	void saveCongregationApplication(congregation, application);
};

export const submitUserFieldServiceReport = (
	userId: string,
	report: StandardRecord,
) => {
	const { congregation } = getUserCongregation(userId);
	void saveIncomingFieldServiceReport(congregation, report);
};

const saveIncomingFieldServiceReport = async (
	congregation: ReturnType<typeof getUserCongregation>['congregation'],
	report: StandardRecord,
): Promise<void> => {
	const incomingReports = mergeIncomingFieldServiceReport(
		congregation.incoming_reports,
		report,
	);

	congregation.incoming_reports = incomingReports;
	await congregation.saveIncomingReports(incomingReports);
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
	const { user, congregation } = getUserCongregation(userId);
	const persons = await congregation.getPersons();
	const person = persons.find((record) => {
		return record.person_uid === user.profile.congregation!.user_local_uid;
	});

	if (!person) return;

	const personData = person.person_data as StandardRecord;
	personData.timeAway = timeAway;
	personData.emergency_contacts = emergencyContacts;

	await congregation.savePersons(persons);
};

export const getUserCongregationUpdates = async (
	userId: string,
): Promise<CongregationUpdatesType> => {
	const { user, congregation } = getUserCongregation(userId);
	const roles = user.profile.congregation!.cong_role;
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
			await congregation.saveIncomingReports([]);
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
	const user = UsersList.findById(userId)!;
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
		await user.updateProfile(profile);
	}

	await saveCongregationMembershipRequest(congregation, userId);
	return 'request_sent';
};
