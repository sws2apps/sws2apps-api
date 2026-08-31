import type { StandardRecord } from '../../types/standard-record.js';
import {
	deleteFileFromStorage,
	listFilesFromStorage,
	uploadFileToStorage,
} from '../../platform/firebase/storage.js';

export const getCongregationApplications = async (cong_id: string) => {
	const files = await listFilesFromStorage({
		type: 'congregation',
		path: `${cong_id}/auxiliary_applications`,
		pathIncludes: '.txt',
		includeContents: true,
	});

	return files.map((file) => JSON.parse(file.contents!) as StandardRecord);
};

export const saveCongregationApplicationRecord = async (congId: string, application: StandardRecord) => {
	const data = JSON.stringify(application);

	const path = `${congId}/auxiliary_applications/${application.request_id}.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const deleteCongregationApplicationRecord = async (congId: string, requestId: string) => {
	const path = `${congId}/auxiliary_applications/${requestId}.txt`;
	await deleteFileFromStorage({ type: 'congregation', path });
};

