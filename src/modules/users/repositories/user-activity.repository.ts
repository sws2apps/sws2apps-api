import type { StandardRecord } from '../../../types/standard-record.js';
import {
	getFileFromStorage,
	uploadFileToStorage,
} from '#platform/firebase/storage.js';

export const getUserBibleStudies = async (id: string) => {
	const path = `${id}/bible_studies.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const studies = JSON.parse(data) as StandardRecord[];
		return studies;
	}

	return [];
};

export const setUserBibleStudies = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/bible_studies.txt`;
	await uploadFileToStorage(data, { type: 'user', path });
};

export const getUserFieldServiceReports = async (id: string) => {
	const path = `${id}/field_service_reports.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const reports = JSON.parse(data) as StandardRecord[];
		return reports;
	}

	return [];
};

export const setUserFieldServiceReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/field_service_reports.txt`;
	await uploadFileToStorage(data, { type: 'user', path });
};

export const getDelegatedFieldServiceReports = async (id: string) => {
	const path = `${id}/delegated_field_service_reports.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const reports = JSON.parse(data) as StandardRecord[];
		return reports;
	}

	return [];
};

export const setDelegatedFieldServiceReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/delegated_field_service_reports.txt`;
	await uploadFileToStorage(data, { type: 'user', path });
};
