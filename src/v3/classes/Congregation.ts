import { AppRoleType, StandardRecord } from '../definition/app.js';
import {
	BackupData,
	CongregationUpdatesType,
	CongRequestPendingType,
	CongSettingsType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
} from '../definition/congregation.js';
import { decryptData } from '../services/encryption/encryption.js';
import {
	approveCongAccess,
	deleteAPApplication,
	getCongDetails,
	publishCongSchedules,
	rejectCongAccess,
	requestCongAccess,
	saveAPApplication,
	saveCongBackup,
	setCongSettings,
} from '../services/firebase/congregations.js';
import { CongregationsList } from './Congregations.js';
import { User } from './User.js';
import { UsersList } from './Users.js';

export class Congregation {
	id: string;
	public_schedules: {
		sources: string;
		schedules: string;
		outgoing_talks: string;
		incoming_talks: string;
	};
	members: User[];
	persons: StandardRecord[];
	settings: CongSettingsType;
	sources: StandardRecord[];
	schedules: StandardRecord[];
	field_service_groups: StandardRecord[];
	visiting_speakers: StandardRecord[];
	outgoing_speakers: OutgoingSpeakersRecordType;
	branch_field_service_reports: StandardRecord[];
	branch_cong_analysis: StandardRecord[];
	meeting_attendance: StandardRecord[];
	speakers_congregations: StandardRecord[];
	ap_applications: StandardRecord[];
	incoming_reports: StandardRecord[];
	field_service_reports: StandardRecord[];

	constructor(id: string) {
		this.id = id;
		this.public_schedules = { schedules: '', sources: '', outgoing_talks: '', incoming_talks: '' };
		this.settings = {
			attendance_online_record: '',
			circuit_overseer: '',
			cong_access_code: '',
			cong_circuit: [{ type: 'main', value: '', updatedAt: '' }],
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
			midweek_meeting: [
				{
					type: 'main',
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
		this.branch_cong_analysis = [];
		this.branch_field_service_reports = [];
		this.field_service_groups = [];
		this.meeting_attendance = [];
		this.members = [];
		this.persons = [];
		this.schedules = [];
		this.sources = [];
		this.speakers_congregations = [];
		this.visiting_speakers = [];
		this.ap_applications = [];
		this.incoming_reports = [];
		this.field_service_reports = [];
	}

	async loadDetails() {
		const data = await getCongDetails(this.id);

		this.public_schedules.outgoing_talks = data.public.outgoing_talks || '';
		this.public_schedules.schedules = data.public.meeting_schedules || '';
		this.public_schedules.sources = data.public.meeting_source || '';
		this.settings = data.settings;
		this.persons = data.cong_persons;
		this.outgoing_speakers = data.outgoing_speakers;
		this.settings = data.settings;
		this.ap_applications = data.applications;

		if (data.field_service_reports) {
			this.field_service_reports = JSON.parse(data.field_service_reports);
		}

		if (data.branch_cong_analysis) {
			this.branch_cong_analysis = JSON.parse(data.branch_cong_analysis);
		}

		if (data.branch_field_service_reports) {
			this.branch_field_service_reports = JSON.parse(data.branch_field_service_reports);
		}

		if (data.field_service_groups) {
			this.field_service_groups = JSON.parse(data.field_service_groups);
		}

		if (data.meeting_attendance) {
			this.meeting_attendance = JSON.parse(data.meeting_attendance);
		}

		if (data.schedules) {
			this.schedules = JSON.parse(data.schedules);
		}

		if (data.sources) {
			this.sources = JSON.parse(data.sources);
		}

		if (data.speakers_congregations) {
			this.speakers_congregations = JSON.parse(data.speakers_congregations);
		}

		if (data.visiting_speakers) {
			this.visiting_speakers = JSON.parse(data.visiting_speakers);
		}

		if (data.incoming_reports) {
			this.incoming_reports = JSON.parse(data.incoming_reports);
		}

		this.reloadMembers();
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

		if (scheduleEditor && cong_backup.app_settings.cong_settings) {
			const accessCode = this.settings.cong_access_code;
			const masterKey = this.settings.cong_master_key;

			cong_backup.app_settings.cong_settings.cong_access_code = accessCode;
			cong_backup.app_settings.cong_settings.cong_master_key = masterKey;
		}

		const lastBackup = await saveCongBackup(this.id, cong_backup, userRole);

		if (scheduleEditor && cong_backup.persons) {
			this.persons = cong_backup.persons;
		}

		if (publicTalkEditor && cong_backup.outgoing_speakers) {
			this.outgoing_speakers.list = cong_backup.outgoing_speakers;
		}

		if (publicTalkEditor && cong_backup.speakers_congregations) {
			this.speakers_congregations = cong_backup.speakers_congregations;
		}

		if (publicTalkEditor && cong_backup.visiting_speakers) {
			this.visiting_speakers = cong_backup.visiting_speakers;
		}

		if (adminRole && cong_backup.branch_field_service_reports) {
			this.branch_field_service_reports = cong_backup.branch_field_service_reports;
		}

		if (adminRole && cong_backup.branch_cong_analysis) {
			this.branch_cong_analysis = cong_backup.branch_cong_analysis;
		}

		if (serviceCommiteeRole && cong_backup.field_service_groups) {
			this.field_service_groups = cong_backup.field_service_groups;
		}

		if (scheduleEditor && cong_backup.sched) {
			this.schedules = cong_backup.sched;
		}

		if (scheduleEditor && cong_backup.sources) {
			this.sources = cong_backup.sources;
		}

		if (secretaryRole && cong_backup.incoming_reports) {
			this.incoming_reports = cong_backup.incoming_reports;
		}

		if (elderRole && cong_backup.cong_field_service_reports) {
			this.field_service_reports = cong_backup.cong_field_service_reports;
		}

		if (attendanceEditor && cong_backup.meeting_attendance) {
			this.meeting_attendance = cong_backup.meeting_attendance;
		}

		let settings: CongSettingsType;

		if (scheduleEditor && cong_backup.app_settings.cong_settings) {
			settings = structuredClone(cong_backup.app_settings.cong_settings);
		}

		if (!scheduleEditor) {
			settings = this.settings;
		}

		settings!.last_backup = lastBackup;
		this.settings = settings!;
	}

	async saveMasterKey(key: string) {
		const settings = structuredClone(this.settings);
		settings.cong_master_key = key;

		await setCongSettings(this.id, settings);

		this.settings = settings;
	}

	async saveAccessCode(code: string) {
		const settings = structuredClone(this.settings);
		settings.cong_access_code = code;

		await setCongSettings(this.id, settings);

		this.settings = settings;
	}

	hasMember(id: string) {
		const user = UsersList.findById(id);

		if (!user) return false;

		return user!.profile.congregation?.id === this.id;
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

	async publishSchedules(sources: string, schedules: string, talks: string) {
		await publishCongSchedules(this.id, sources, schedules, talks);

		this.public_schedules.sources = sources;
		this.public_schedules.schedules = schedules;
		this.public_schedules.outgoing_talks = talks;
	}

	copyOutgoingTalkSchedule(talks: OutgoingTalkScheduleType[]) {
		if (talks.length > 0) {
			const congregations = CongregationsList.list.filter((record) =>
				record.outgoing_speakers.access.find((cong) => cong.cong_id === this.id && cong.status === 'approved')
			);

			for (const congregation of congregations) {
				let schedules: OutgoingTalkScheduleType[] =
					congregation.public_schedules.incoming_talks === '' ? [] : JSON.parse(congregation.public_schedules.incoming_talks);

				schedules = schedules.filter((record) => record.sender !== this.id);

				const newSchedule = talks.filter((record) => record.recipient === congregation.id);

				schedules.push(...newSchedule);

				congregation.public_schedules.incoming_talks = schedules.length === 0 ? '' : JSON.stringify(schedules);
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
}
