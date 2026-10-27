import type {
	FieldServiceDocument,
	FieldServiceMeetingReceipt,
	FieldServiceMeetingRecord,
	SchedulingActor,
	SchedulingScopeUpload,
} from './types.js';
import { FieldServiceWriteError } from './types.js';
import { mergeFieldServiceUpload } from './policy.js';
import {
	getFieldServiceDocument,
	updateFieldServiceDocument,
} from './field-service-meetings.repository.js';

export const getFieldServiceMeetings = async (
	congregationId: string,
): Promise<FieldServiceMeetingRecord[]> => {
	return (await getFieldServiceDocument(congregationId)).meetings;
};

/** Groups whose meetings this person may schedule under the stored, administrator-maintained scope. */
export const getManagedFieldServiceGroupIds = async (
	congregationId: string,
	personUid: string,
): Promise<Set<string>> => {
	const { scope } = await getFieldServiceDocument(congregationId);
	return new Set(scope.filter((group) => group.manager_uids.includes(personUid)).map((group) => group.group_id));
};

export type FieldServiceMeetingWriteOperations = {
	updateDocument: typeof updateFieldServiceDocument;
};

const defaultWriteOperations: FieldServiceMeetingWriteOperations = {
	updateDocument: updateFieldServiceDocument,
};

/** Resolve the actor inside each storage transaction so revoked rights cannot survive a competing upload. */
export const saveFieldServiceMeetings = (
	congregationId: string,
	resolveActor: () => SchedulingActor,
	meetings?: FieldServiceMeetingRecord[],
	scope?: SchedulingScopeUpload,
	operations: Partial<FieldServiceMeetingWriteOperations> = {},
): Promise<FieldServiceDocument> => {
	const writing = { ...defaultWriteOperations, ...operations };

	return writing.updateDocument(congregationId, (document) => {
		const actor = resolveActor();
		if (actor.congregationId !== congregationId) throw new FieldServiceWriteError('FORBIDDEN');
		return mergeFieldServiceUpload(document, actor, meetings, scope);
	});
};

/** Acknowledge only submitted records so clients can retain edits made during upload. */
export const getFieldServiceMeetingReceipts = (
	document: FieldServiceDocument,
	upload: FieldServiceMeetingRecord[] = [],
): FieldServiceMeetingReceipt[] => {
	const saved = new Map(document.meetings.map((record) => [record.meeting_uid, record]));
	return upload.map((record) => {
		const persisted = saved.get(record.meeting_uid);
		if (!persisted?.revision) throw new Error('Field service meeting persistence was not acknowledged');

		return {
			meeting_uid: record.meeting_uid,
			base_revision: record.revision,
			revision: persisted.revision,
			updatedAt: persisted.authorization.updatedAt,
		};
	});
};
