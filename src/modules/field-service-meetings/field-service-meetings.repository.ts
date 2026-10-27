import {
	getFileFromStorage,
	getFileMetadata,
	readModifyWriteVersionedFile,
} from '#platform/firebase/storage.js';
import type { FieldServiceDocument } from './types.js';

const fieldServiceStoragePath = (congregationId: string) => ({
	type: 'congregation' as const,
	path: `${congregationId}/field_service_meetings/main.txt`,
});

const parseFieldServiceDocument = (value: string | undefined): FieldServiceDocument => {
	if (value !== undefined) return JSON.parse(value) as FieldServiceDocument;

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
		return {
			data: JSON.stringify(document),
			result: document,
			metadata: {
				meetings_revision: document.meetings_revision,
				scope_revision: document.scope_revision,
			},
		};
	});
};

type FieldServiceMetadataOperations = {
	getMetadata: typeof getFileMetadata;
	getDocument: typeof getFieldServiceDocument;
};

const defaultMetadataOperations: FieldServiceMetadataOperations = {
	getMetadata: getFileMetadata,
	getDocument: getFieldServiceDocument,
};

export const getFieldServiceMetadata = async (
	congregationId: string,
	operations: Partial<FieldServiceMetadataOperations> = {},
) => {
	const loading = { ...defaultMetadataOperations, ...operations };
	const metadata = await loading.getMetadata(fieldServiceStoragePath(congregationId));
	const revisions = metadata?.metadata;
	if (typeof revisions?.meetings_revision === 'string' && typeof revisions.scope_revision === 'string') {
		return {
			field_service_meetings: revisions.meetings_revision,
			field_service_scheduling: revisions.scope_revision,
		};
	}
	const document = await loading.getDocument(congregationId);
	return {
		field_service_meetings: document.meetings_revision,
		field_service_scheduling: document.scope_revision,
	};
};
