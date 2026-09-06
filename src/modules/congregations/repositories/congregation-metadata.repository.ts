import {
	getFileMetadata,
	listFilesFromStorage,
} from '#platform/firebase/storage.js';

export const getPersonsMetadata = async (cong_id: string) => {
	const files = await listFilesFromStorage({
		type: 'congregation',
		path: `${cong_id}/persons`,
	});
	const dates = files.map((file) => file.updatedAt);

	const updated = dates.toSorted((a, b) => b.localeCompare(a)).at(0) || '';

	return updated;
};

export const getBranchCongAnalysisMetadata = async (cong_id: string) => {
	const branchCongAnalysis = await getFileMetadata({ type: 'congregation', path: `${cong_id}/branch_cong_analysis/main.txt` });

	return branchCongAnalysis?.updated || '';
};

export const getBranchFieldServiceReportsMetadata = async (cong_id: string) => {
	const branchFieldServiceReports = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/branch_field_service_reports/main.txt`,
	});

	return branchFieldServiceReports?.updated || '';
};

export const getFieldServiceGroupsMetadata = async (cong_id: string) => {
	const fieldServiceGroups = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/field_service_groups/main.txt`,
	});

	return fieldServiceGroups?.updated || '';
};

export const getFieldServiceReportsMetadata = async (cong_id: string) => {
	const fieldServiceReports = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/field_service_reports/main.txt`,
	});

	return fieldServiceReports?.updated || '';
};

export const getMeetingAttendanceMetadata = async (cong_id: string) => {
	const meetingAttendance = await getFileMetadata({ type: 'congregation', path: `${cong_id}/meeting_attendance/main.txt` });

	return meetingAttendance?.updated || '';
};

export const getSchedulesMetadata = async (cong_id: string) => {
	const schedules = await getFileMetadata({ type: 'congregation', path: `${cong_id}/schedules/main.txt` });

	return schedules?.updated || '';
};

export const getSourcesMetadata = async (cong_id: string) => {
	const sources = await getFileMetadata({ type: 'congregation', path: `${cong_id}/sources/main.txt` });

	return sources?.updated || '';
};

export const getSpeakersCongregationsMetadata = async (cong_id: string) => {
	const speakersCongregations = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/speakers_congregations/main.txt`,
	});

	return speakersCongregations?.updated || '';
};

export const getVisitingSpeakersMetadata = async (cong_id: string) => {
	const visitingSpeakers = await getFileMetadata({ type: 'congregation', path: `${cong_id}/visiting_speakers/main.txt` });

	return visitingSpeakers?.updated || '';
};

export const getSettingsMetadata = async (cong_id: string) => {
	const settings = await getFileMetadata({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	return settings?.updated || '';
};

export const getIncomingReportsMetadata = async (cong_id: string) => {
	const incomingReports = await getFileMetadata({ type: 'congregation', path: `${cong_id}/field_service_reports/incoming.txt` });

	return incomingReports?.updated || '';
};

export const getPublicSourcesMetadata = async (cong_id: string) => {
	const publicSources = await getFileMetadata({ type: 'congregation', path: `${cong_id}/public/sources.txt` });

	return publicSources?.updated || '';
};

export const getPublicSchedulesMetadata = async (cong_id: string) => {
	const publicSchedules = await getFileMetadata({ type: 'congregation', path: `${cong_id}/public/schedules.txt` });

	return publicSchedules?.updated || '';
};

export const getCongregationMetadata = async (cong_id: string) => {
	return {
		branch_cong_analysis: await getBranchCongAnalysisMetadata(cong_id),
		branch_field_service_reports: await getBranchFieldServiceReportsMetadata(cong_id),
		field_service_groups: await getFieldServiceGroupsMetadata(cong_id),
		cong_field_service_reports: await getFieldServiceReportsMetadata(cong_id),
		meeting_attendance: await getMeetingAttendanceMetadata(cong_id),
		persons: await getPersonsMetadata(cong_id),
		schedules: await getSchedulesMetadata(cong_id),
		cong_settings: await getSettingsMetadata(cong_id),
		sources: await getSourcesMetadata(cong_id),
		speakers_congregations: await getSpeakersCongregationsMetadata(cong_id),
		visiting_speakers: await getVisitingSpeakersMetadata(cong_id),
		incoming_reports: await getIncomingReportsMetadata(cong_id),
		public_sources: await getPublicSourcesMetadata(cong_id),
		public_schedules: await getPublicSchedulesMetadata(cong_id),
		upcoming_events: await getUpcomingEventsMetadata(cong_id),
	};
};

export const getUpcomingEventsMetadata = async (cong_id: string) => {
	const record = await getFileMetadata({ type: 'congregation', path: `${cong_id}/upcoming_events/main.txt` });
	return record?.updated || '';
};
