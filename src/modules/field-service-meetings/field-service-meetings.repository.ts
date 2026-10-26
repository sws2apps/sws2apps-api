import {
	getFileFromStorage,
	readModifyWriteVersionedFile,
} from '#platform/firebase/storage.js';
import type { FieldServiceDocument } from './types.js';

const fieldServiceStoragePath = (congregationId: string) => ({
	type: 'congregation' as const,
	path: `${congregationId}/field_service_meetings/main.txt`,
});

const parseFieldServiceDocument = (value: string | undefined): FieldServiceDocument => {
	if (value) return JSON.parse(value) as FieldServiceDocument;

	return { scope: [], scope_revision: '', meetings: [], meetings_revision: '' };
};

export const getFieldServiceDocument = async (congregationId: string): Promise<FieldServiceDocument> => {
	const storedData = await getFileFromStorage(fieldServiceStoragePath(congregationId));
	return parseFieldServiceDocument(storedData);
};

export const updateFieldServiceDocument = (
	congregationId: string,
	modify: (document: FieldServiceDocument) => FieldServiceDocument,
): Promise<FieldServiceDocument> => {
	return readModifyWriteVersionedFile(fieldServiceStoragePath(congregationId), (current) => {
		const document = modify(parseFieldServiceDocument(current));
		return { data: JSON.stringify(document), result: document };
	});
};

export const getFieldServiceMetadata = async (congregationId: string) => {
	const document = await getFieldServiceDocument(congregationId);
	return {
		field_service_meetings: document.meetings_revision,
		field_service_scheduling: document.scope_revision,
	};
};
