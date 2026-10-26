import { getFileFromStorage, readModifyWriteVersionedFile } from '#platform/firebase/storage.js';
import type { FieldServiceDocument } from './types.js';

const location = (congregationId: string) => ({ type: 'congregation' as const, path: `${congregationId}/field_service_meetings/main.txt` });
const parse = (value: string | undefined): FieldServiceDocument => value ? JSON.parse(value) as FieldServiceDocument : {
	scope: [], scope_revision: '', meetings: [], meetings_revision: '',
};

export const getFieldServiceDocument = async (congregationId: string) => parse(await getFileFromStorage(location(congregationId)));

export const updateFieldServiceDocument = (
	congregationId: string,
	modify: (document: FieldServiceDocument) => FieldServiceDocument,
) => readModifyWriteVersionedFile(location(congregationId), async (current) => {
	const document = modify(parse(current));
	return { data: JSON.stringify(document), result: document };
});

export const getFieldServiceMetadata = async (congregationId: string) => {
	const document = await getFieldServiceDocument(congregationId);
	return { field_service_meetings: document.meetings_revision, field_service_scheduling: document.scope_revision };
};
