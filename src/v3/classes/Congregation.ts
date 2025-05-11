import { getStorage } from 'firebase-admin/storage';
import { AppRoleType, StandardRecord } from '../definition/app.js';
import {
	BackupData,
	CongregationUpdatesType,
	CongRequestPendingType,
	CongSettingsType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
	UserRequestAccess,
} from '../definition/congregation.js';
import { decryptData } from '../services/encryption/encryption.js';
import {
	approveCongAccess,
	deleteAPApplication,
	getBranchCongAnalysisMetadata,
	getBranchFieldServiceReportsMetadata,
	getCongDetails,
	getFieldServiceGroupsMetadata,
	getFieldServiceReportsMetadata,
	getIncomingReportsMetadata,
	getMeetingAttendanceMetadata,
	getPersonsMetadata,
	getPublicSchedulesMetadata,
	getPublicSourcesMetadata,
	getSchedulesMetadata,
	getSettingsMetadata,
	getSourcesMetadata,
	getSpeakersCongregationsMetadata,
	getVisitingSpeakersMetadata,
	rejectCongAccess,
	requestCongAccess,
	saveAPApplication,
	setBranchCongAnalysis,
	setBranchFieldServiceReports,
	setCongFieldServiceGroups,
	setCongFieldServiceReports,
	setCongFlags,
	setCongJoinRequests,
	setCongOutgoingSpeakers,
	setCongPersons,
	setCongPublicOutgoingTalks,
	setCongPublicSchedules,
	setCongPublicSources,
	setCongSchedules,
	setCongSettings,
	setCongSources,
	setCongSpeakersKey,
	setCongVisitingSpeakers,
	setIncomingReports,
	setMeetingAttendance,
	setSpeakersCongregations,
} from '../services/firebase/congregations.js';
import { CongregationsList } from './Congregations.js';
import { User } from './User.js';
import { UsersList } from './Users.js';
import { getFileFromStorage, uploadFileToStorage } from '../services/firebase/storage_utils.js';
import { syncFromIncoming } from '../utils/congregation_utils.js';

export class Congregation {
	id: string;
	createdAt: string;
	members: User[];
	settings: CongSettingsType;
	outgoing_speakers: OutgoingSpeakersRecordType;
	metadata: Record<string, string>;
	flags: string[];
	join_requests: UserRequestAccess[];
	ap_applications: StandardRecord[];
	incoming_reports: StandardRecord[];

	constructor(id: string) {
		this.id = id;
		this.createdAt = '';

		this.metadata = {
			persons: '',
			cong_settings: '',
			sources: '',
			schedules: '',
			field_service_groups: '',
			visiting_speakers: '',
			branch_field_service_reports: '',
			branch_cong_analysis: '',
			meeting_attendance: '',
			speakers_congregations: '',
			cong_field_service_reports: '',
		};

		this.settings = {
			attendance_online_record: '',
			circuit_overseer: '',
			cong_access_code: '',
			cong_circuit: [{ type: 'main', value: '', updatedAt: '', _deleted: false }],
			cong_discoverable: { value: false, updatedAt: '' },
			cong_location: { lat: undefined, lng: undefined, address: '', updatedAt: '' },
			cong_master_key: '',
			cong_name: '',
			cong_new: true,
			cong_number: '',
			country_code: '',
			display_name_enabled: '',
			format_24h_enabled: '',
			fullname_option: '',
			language_groups: '',
			last_backup: '',
			responsabilities: '',
			schedule_exact_date_enabled: '',
			short_date_format: '',
			source_material_auto_import: '',
			special_months: '',
			time_away_public: { value: false, updatedAt: '' },
			week_start_sunday: '',
			data_sync: { value: false, updatedAt: '' },
			group_publishers_sort: '',
			midweek_meeting: [
				{
					type: 'main',
					_deleted: { value: false, updatedAt: '' },
					weekday: { value: undefined, updatedAt: '' },
					time: { value: '', updatedAt: '' },
					aux_class_counselor_default: '',
					class_count: '',
					closing_prayer_auto_assigned: '',
					opening_prayer_auto_assigned: '',
				},
			],
			weekend_meeting: [
				{
					type: 'main',
					_deleted: { value: false, updatedAt: '' },
					weekday: { value: undefined, updatedAt: '' },
					time: { value: '', updatedAt: '' },
					consecutive_monthly_parts_notice_shown: '',
					opening_prayer_auto_assigned: '',
					outgoing_talks_schedule_public: '',
					substitute_speaker_enabled: '',
					substitute_w_study_conductor_displayed: '',
					w_study_conductor_default: '',
				},
			],
		};
		this.outgoing_speakers = { list: [], speakers_key: '', access: [] };
		this.members = [];
		this.flags = [];
		this.join_requests = [];
		this.ap_applications = [];
		this.incoming_reports = [];
	}

	async loadDetails() {
		const data = await getCongDetails(this.id);

		this.createdAt = data.createdAt || '';
		this.metadata = data.metadata;
		this.settings = data.settings;
		this.outgoing_speakers = data.outgoing_speakers;
		this.flags = data.flags;
		this.join_requests = data.join_requests;
		this.ap_applications = data.applications;

		if (data.incoming_reports) {
			this.incoming_reports = JSON.parse(data.incoming_reports);
		}

		this.reloadMembers();
	}

	async savePersons(persons: StandardRecord[]) {
		await setCongPersons(this.id, persons);
		this.metadata.persons = await getPersonsMetadata(this.id);
	}

	async getPersons() {
		const storageBucket = getStorage().bucket();
		const [files] = await storageBucket.getFiles({ prefix: `v3/congregations/${this.id}/persons` });

		const cong_persons: StandardRecord[] = [];

		for await (const file of files) {
			const contents = await file.download();
			const person = decryptData(contents.toString())!;

			cong_persons.push(JSON.parse(person));
		}

		return cong_persons;
	}

	async saveSettings(settings: CongSettingsType) {
		await setCongSettings(this.id, settings);
		this.settings = settings;
		this.metadata.cong_settings = await getSettingsMetadata(this.id);
	}

	async saveSources(sources: StandardRecord[]) {
		await setCongSources(this.id, sources);
		this.metadata.sources = await getSourcesMetadata(this.id);
	}

	async saveSchedules(schedules: StandardRecord[]) {
		await setCongSchedules(this.id, schedules);
		this.metadata.schedules = await getSchedulesMetadata(this.id);
	}

	async saveFieldServiceReports(reports: StandardRecord[]) {
		await setCongFieldServiceReports(this.id, reports);
		this.metadata.cong_field_service_reports = await getFieldServiceReportsMetadata(this.id);
	}

	async saveFieldServiceGroups(groups: StandardRecord[]) {
		await setCongFieldServiceGroups(this.id, groups);
		this.metadata.field_service_groups = await getFieldServiceGroupsMetadata(this.id);
	}

	async saveVisitingSpeakers(speakers: StandardRecord[]) {
		await setCongVisitingSpeakers(this.id, speakers);
		this.metadata.visiting_speakers = await getVisitingSpeakersMetadata(this.id);
	}

	async saveBranchFieldServiceReports(reports: StandardRecord[]) {
		await setBranchFieldServiceReports(this.id, reports);
		this.metadata.branch_field_service_reports = await getBranchFieldServiceReportsMetadata(this.id);
	}

	async saveBranchCongAnalysis(reports: StandardRecord[]) {
		await setBranchCongAnalysis(this.id, reports);
		this.metadata.branch_cong_analysis = await getBranchCongAnalysisMetadata(this.id);
	}

	async saveMeetingAttendance(reports: StandardRecord[]) {
		await setMeetingAttendance(this.id, reports);
		this.metadata.meeting_attendance = await getMeetingAttendanceMetadata(this.id);
	}

	async saveSpeakersCongregations(congregations: StandardRecord[]) {
		await setSpeakersCongregations(this.id, congregations);
		this.metadata.speakers_congregations = await getSpeakersCongregationsMetadata(this.id);
	}

	async saveSpeakersKey(key: string) {
		await setCongSpeakersKey(this.id, key);
		this.outgoing_speakers.speakers_key = key;
	}

	async saveOutgoingSpeakers(speakers: StandardRecord[]) {
		const outgoingData = {
			list: speakers,
			access: this.outgoing_speakers.access,
		};

		await setCongOutgoingSpeakers(this.id, JSON.stringify(outgoingData));

		this.outgoing_speakers.list = speakers;
	}

	async saveIncomingReports(reports: StandardRecord[]) {
		await setIncomingReports(this.id, reports);
		this.incoming_reports = reports;
		this.metadata.incoming_reports = await getIncomingReportsMetadata(this.id);
	}

	async saveBackup(cong_backup: BackupData, userRole: AppRoleType[]) {
		const secretaryRole = userRole.includes('secretary');

		const adminRole = secretaryRole || userRole.some((role) => role === 'admin' || role === 'coordinator');

		const serviceCommiteeRole = adminRole || userRole.includes('service_overseer');

		const elderRole = adminRole || userRole.includes('elder');

		const scheduleEditor =
			adminRole ||
			userRole.some((role) => role === 'midweek_schedule' || role === 'weekend_schedule' || role === 'public_talk_schedule');

		const publicTalkEditor = adminRole || userRole.includes('public_talk_schedule');

		const attendanceEditor = adminRole || userRole.includes('attendance_tracking');

		if (scheduleEditor && cong_backup.app_settings?.cong_settings) {
			const accessCode = this.settings.cong_access_code;
			const masterKey = this.settings.cong_master_key;

			cong_backup.app_settings.cong_settings.cong_access_code = accessCode;
			cong_backup.app_settings.cong_settings.cong_master_key = masterKey;

			const newSettings = structuredClone(this.settings);

			syncFromIncoming(newSettings, cong_backup.app_settings.cong_settings);

			await this.saveSettings(newSettings);
		}

		if (this.settings.data_sync.value) {
			if (scheduleEditor && cong_backup.persons) {
				await this.savePersons(cong_backup.persons);
			}

			if (publicTalkEditor && cong_backup.speakers_congregations) {
				await this.saveSpeakersCongregations(cong_backup.speakers_congregations);
			}

			if (publicTalkEditor && cong_backup.visiting_speakers) {
				await this.saveVisitingSpeakers(cong_backup.visiting_speakers);
			}

			if (publicTalkEditor && cong_backup.visiting_speakers) {
				await this.saveBranchFieldServiceReports(cong_backup.branch_field_service_reports);
			}

			if (publicTalkEditor && cong_backup.speakers_key) {
				await this.saveSpeakersKey(cong_backup.speakers_key);
			}

			if (adminRole && cong_backup.branch_cong_analysis) {
				await this.saveBranchCongAnalysis(cong_backup.branch_cong_analysis);
			}

			if (serviceCommiteeRole && cong_backup.field_service_groups) {
				await this.saveFieldServiceGroups(cong_backup.field_service_groups);
			}

			if (scheduleEditor && cong_backup.sched) {
				await this.saveSchedules(cong_backup.sched);
			}

			if (scheduleEditor && cong_backup.sources) {
				await this.saveSources(cong_backup.sources);
			}

			if (elderRole && cong_backup.cong_field_service_reports) {
				await this.saveFieldServiceReports(cong_backup.cong_field_service_reports);
			}

			if (attendanceEditor && cong_backup.meeting_attendance) {
				await this.saveMeetingAttendance(cong_backup.meeting_attendance);
			}

			if (publicTalkEditor && cong_backup.outgoing_speakers) {
				await this.saveOutgoingSpeakers(cong_backup.outgoing_speakers);
			}

			if (secretaryRole && cong_backup.incoming_reports) {
				await this.saveIncomingReports(cong_backup.incoming_reports);
			}
		}

		if (adminRole && cong_backup.cong_users) {
			for await (const user of cong_backup.cong_users) {
				const findUser = UsersList.findById(user.id);

				if (!findUser) continue;

				const profile = structuredClone(findUser.profile);
				profile.congregation!.cong_role = user?.role || [];

				await findUser.updateProfile(profile);
			}
		}
	}

	async saveMasterKey(key: string) {
		const settings = structuredClone(this.settings);
		settings.cong_master_key = key;

		await this.saveSettings(settings);
	}

	async saveAccessCode(code: string) {
		const settings = structuredClone(this.settings);
		settings.cong_access_code = code;

		await this.saveSettings(settings);
	}

	hasMember(id: string) {
		const user = UsersList.findById(id);

		if (!user) return false;

		return user.profile.congregation?.id === this.id;
	}

	reloadMembers() {
		const cong_members: User[] = [];

		for (const user of UsersList.list) {
			if (user.profile.congregation?.id === this.id) {
				cong_members.push(user);
			}
		}

		this.members = cong_members;
	}

	getVisitingSpeakersAccessList() {
		const approvedCong = this.outgoing_speakers.access.filter((record) => record.status === 'approved');

		const result = approvedCong.map((cong) => {
			const foundCong = CongregationsList.findById(cong.cong_id)!;

			return {
				cong_id: cong.cong_id,
				request_id: cong.request_id,
				cong_number: foundCong.settings.cong_number,
				cong_name: foundCong.settings.cong_name,
			};
		});

		return result;
	}

	async requestAccessCongregation(cong_id: string, key: string, request_id: string) {
		await requestCongAccess(this.id, cong_id, key, request_id);
	}

	getPendingVisitingSpeakersAccessList() {
		const pendingCong = this.outgoing_speakers.access.filter((record) => record.status === 'pending');

		const result: CongRequestPendingType[] = pendingCong.map((cong) => {
			const foundCong = CongregationsList.findById(cong.cong_id)!;

			return {
				cong_id: cong.cong_id,
				updatedAt: cong.updatedAt,
				cong_number: foundCong.settings.cong_number,
				cong_name: foundCong.settings.cong_name,
				country_code: foundCong.settings.country_code,
				request_id: cong.request_id,
			};
		});

		return result;
	}

	async approveCongregationRequest(request_id: string, key: string) {
		await approveCongAccess(this.id, request_id, key);
	}

	async rejectCongregationRequest(request_id: string) {
		await rejectCongAccess(this.id, request_id);
	}

	getRemoteCongregationsList() {
		const approvedRequests = CongregationsList.list.filter((record) =>
			record.outgoing_speakers.access.find((access) => access.cong_id === this.id && access.status === 'approved')
		);

		const congs = approvedRequests.map((cong) => {
			const requestDetails = cong.outgoing_speakers.access.find(
				(access) => access.cong_id === this.id && access.status === 'approved'
			)!;

			return {
				list: cong.outgoing_speakers.list,
				cong_id: cong.id,
				key: requestDetails.key,
				status: 'approved',
				updatedAt: requestDetails.updatedAt,
				cong_name: cong.settings.cong_name,
				cong_number: cong.settings.cong_number,
				country_code: cong.settings.country_code,
				request_id: requestDetails.request_id,
			};
		});

		return congs as CongregationUpdatesType['remote_congregations'];
	}

	getRejectedRequests() {
		const disapprovedRequests = CongregationsList.list.filter((record) =>
			record.outgoing_speakers.access.find((access) => access.cong_id === this.id && access.status === 'disapproved')
		);

		const congs = disapprovedRequests.map((cong) => {
			const requestDetails = cong.outgoing_speakers.access.find(
				(access) => access.cong_id === this.id && access.status === 'disapproved'
			)!;

			return {
				cong_id: cong.id,
				status: 'disapproved',
				updatedAt: requestDetails.updatedAt,
				cong_name: cong.settings.cong_name,
				cong_number: cong.settings.cong_number,
				country_code: cong.settings.country_code,
				request_id: requestDetails.request_id,
			};
		});

		return congs as CongregationUpdatesType['rejected_requests'];
	}

	getMembers(visitorid: string) {
		const members = this.members.map((member) => {
			return {
				id: member.id,
				profile: {
					createdAt: member.profile.createdAt,
					global_role: member.profile.role,
					firstname: member.profile.firstname,
					lastname: member.profile.lastname,
					cong_role: member.profile.congregation?.cong_role,
					user_local_uid: member.profile.congregation?.user_local_uid,
					user_members_delegate: member.profile.congregation?.user_members_delegate || [],
					pocket_invitation_code:
						typeof member.profile.congregation?.pocket_invitation_code === 'string'
							? decryptData(member.profile.congregation.pocket_invitation_code)
							: undefined,
				},
				sessions:
					member.sessions?.map((session) => {
						return {
							identifier: session.identifier,
							isSelf: session.visitorid === visitorid,
							ip: session.visitor_details.ip,
							country_name: session.visitor_details.ipLocation.country_name,
							device: {
								browserName: session.visitor_details.browser,
								os: session.visitor_details.os,
								isMobile: session.visitor_details.isMobile,
							},
							last_seen: session.last_seen,
						};
					}) || [],
			};
		});

		return members;
	}

	async savePublicSchedules(schedules: string) {
		await setCongPublicSchedules(this.id, schedules);
		this.metadata.public_schedules = await getPublicSchedulesMetadata(this.id);
	}

	async savePublicSources(sources: string) {
		await setCongPublicSources(this.id, sources);
		this.metadata.public_sources = await getPublicSourcesMetadata(this.id);
	}

	async savePublicOutgoingTalks(talks: string) {
		await setCongPublicOutgoingTalks(this.id, talks);
	}

	async publishSchedules(sources?: string, schedules?: string, talks?: string) {
		if (sources) {
			await this.savePublicSources(sources);
		}

		if (schedules) {
			await this.savePublicSchedules(schedules);
		}

		if (talks) {
			await this.savePublicOutgoingTalks(talks);
		}
	}

	async getPublicOutgoingTalks(): Promise<OutgoingTalkScheduleType[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/public/outgoing_talks.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getPublicIncomingTalks(): Promise<OutgoingTalkScheduleType[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/public/incoming_talks.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async savePublicIncomingTalks(schedules: OutgoingTalkScheduleType[]) {
		const data = JSON.stringify(schedules);
		const path = `${this.id}/public/incoming_talks.txt`;
		await uploadFileToStorage(data, { type: 'congregation', path });
	}

	async copyOutgoingTalkSchedule(talks: OutgoingTalkScheduleType[]) {
		if (talks.length > 0) {
			const congregations = CongregationsList.list.filter((record) =>
				record.outgoing_speakers.access.find((cong) => cong.cong_id === this.id && cong.status === 'approved')
			);

			for await (const congregation of congregations) {
				let schedules = await congregation.getPublicIncomingTalks();
				schedules = schedules.filter((record) => record.sender !== this.id);

				const newSchedule = talks.filter((record) => record.recipient === congregation.id);
				schedules.push(...newSchedule);

				await congregation.savePublicIncomingTalks(schedules);
			}
		}
	}

	async saveApplication(application: StandardRecord) {
		await saveAPApplication(this.id, application);

		let current = this.ap_applications.find((record) => record.request_id === application.request_id);

		if (!current) {
			this.ap_applications.push({ request_id: application.request_id });
		}

		current = this.ap_applications.find((record) => record.request_id === application.request_id)!;

		current.person_uid = application.person_uid;
		current.months = application.months;
		current.continuous = application.continuous;
		current.submitted = application.submitted;
		current.status = application.status;
		current.coordinator = application.coordinator;
		current.secretary = application.secretary;
		current.service = application.service;
		current.notified = application.notified;
		current.expired = application.expired;
		current.updatedAt = application.updatedAt;

		// remove expired records
		const expiredAPs = this.ap_applications.filter((record) => {
			if (!record.expired) return false;

			const expired = record.expired as string;
			const now = new Date().toISOString();

			return expired < now;
		});

		for await (const form of expiredAPs) {
			await deleteAPApplication(this.id, form.request_id as string);

			this.ap_applications = this.ap_applications.filter((record) => record.request_id !== form.request_id);
		}
	}

	async deleteApplication(request_id: string) {
		await deleteAPApplication(this.id, request_id);

		this.ap_applications = this.ap_applications.filter((record) => record.request_id !== request_id);
		return this.ap_applications;
	}

	findPocketUser(token: string, accessCode: string) {
		for (const user of this.members) {
			const userToken = user.profile.congregation?.pocket_invitation_code;

			if (!userToken) continue;

			const decryptedToken1 = decryptData(userToken)!;
			const decryptedToken2 = decryptData(decryptedToken1, accessCode);

			if (!decryptedToken2) continue;

			if (token === JSON.parse(decryptedToken2)) {
				return user;
			}
		}
	}

	async saveFlags(flags: string[]) {
		await setCongFlags(this.id, flags);
		this.flags = flags;
	}

	async join(user: string) {
		const requests = this.join_requests.filter((record) => UsersList.list.some((user) => user.id === record.user));

		const request = requests.find((record) => record.user === user);

		if (request) {
			request.request_date = new Date().toISOString();
		}

		if (!request) {
			requests.push({ user, request_date: new Date().toISOString() });
		}

		await setCongJoinRequests(this.id, requests);

		this.join_requests = requests;
	}

	async declineJoinRequest(user: string) {
		const requests = this.join_requests.filter(
			(record) => record.user !== user && UsersList.list.some((user) => user.id === record.user)
		);

		await setCongJoinRequests(this.id, requests);

		this.join_requests = requests;
	}

	async acceptJoinRequest(
		user: string,
		params: { role: AppRoleType[]; person_uid: string; firstname?: string; lastname?: string }
	) {
		const foundUser = UsersList.findById(user)!;
		await foundUser.assignCongregation({ congId: this.id, ...params });

		const requests = this.join_requests.filter(
			(record) => record.user !== user && UsersList.list.some((user) => user.id === record.user)
		);

		await setCongJoinRequests(this.id, requests);

		this.join_requests = requests;
	}

	async getPublicSources() {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/public/sources.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getPublicSchedules() {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/public/schedules.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getFieldServiceGroups() {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/field_service_groups/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getFieldServiceReports(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/field_service_reports/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getSpeakersCongregations(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/speakers_congregations/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getVisitingSpeakers(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/visiting_speakers/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getSources(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/sources/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getSchedules(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/schedules/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getMeetingAttendance(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/meeting_attendance/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getBranchCongAnalysis(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/branch_cong_analysis/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}

	async getBranchFieldServiceReports(): Promise<StandardRecord[]> {
		const data = await getFileFromStorage({ type: 'congregation', path: `${this.id}/branch_field_service_reports/main.txt` });
		return data && data.length > 0 ? JSON.parse(data) : [];
	}
}
