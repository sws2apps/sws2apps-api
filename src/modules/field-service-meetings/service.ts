import type { FieldServiceMeetingRecord, SchedulingActor, SchedulingScopeUpload } from './types.js';
import { mergeFieldServiceUpload } from './policy.js';
import { getFieldServiceDocument, updateFieldServiceDocument } from './repository.js';

export const getFieldServiceMeetings = async (congregationId: string) => (await getFieldServiceDocument(congregationId)).meetings;

/** Resolve the actor inside each storage transaction so revoked rights cannot survive a competing upload. */
export const saveFieldServiceMeetings = (
	congregationId: string,
	resolveActor: () => SchedulingActor,
	meetings?: FieldServiceMeetingRecord[],
	scope?: SchedulingScopeUpload,
) => updateFieldServiceDocument(congregationId, (document) => {
	const actor = resolveActor();
	if (actor.congregationId !== congregationId) throw new Error('Invalid field service congregation');
	return mergeFieldServiceUpload(document, actor, meetings, scope);
});

/** Acknowledge only submitted records so clients can retain edits made during upload. */
export const getFieldServiceMeetingReceipts = (
	document: import('./types.js').FieldServiceDocument,
	upload: FieldServiceMeetingRecord[] = [],
): import('./types.js').FieldServiceMeetingReceipt[] => {
	const saved = new Map(document.meetings.map((record) => [record.meeting_uid, record]));
	return upload.map((record) => ({
		meeting_uid: record.meeting_uid,
		base_revision: record.revision,
		revision: saved.get(record.meeting_uid)!.revision!,
		updatedAt: saved.get(record.meeting_uid)!.authorization.updatedAt,
	}));
};
