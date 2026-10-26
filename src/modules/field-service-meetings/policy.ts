import type { FieldServiceDocument, FieldServiceMeetingRecord, SchedulingActor, SchedulingScopeUpload } from './types.js';
import { FieldServiceWriteError } from './types.js';

const hasRole = (actor: SchedulingActor, roles: readonly string[]) => actor.roles.some((role) => roles.includes(role));
export const canManageSchedulingScope = (actor: SchedulingActor) => hasRole(actor, ['admin', 'coordinator', 'secretary', 'service_overseer']);
export const canManageAllMeetings = (actor: SchedulingActor) => canManageSchedulingScope(actor) || hasRole(actor, ['field_service_schedule']);

const canManageGroup = (actor: SchedulingActor, record: FieldServiceMeetingRecord, document: FieldServiceDocument) => {
	if (canManageAllMeetings(actor)) return true;
	if (!hasRole(actor, ['group_overseers', 'language_group_overseers'])) return false;
	if (record.authorization.category !== 0 || !actor.personUid) return false;
	return document.scope.some((group) => group.group_id === record.authorization.group_id && group.manager_uids.includes(actor.personUid!));
};

const canUseConductor = (record: FieldServiceMeetingRecord, document: FieldServiceDocument) =>
	document.scope.some((group) => group.group_id === record.authorization.group_id && group.conductor_uids.includes(record.authorization.conductor));

const sameScope = (left: FieldServiceDocument['scope'], right: FieldServiceDocument['scope']) => {
	const canonical = (groups: FieldServiceDocument['scope']) => groups.map((group) => ({
		group_id: group.group_id,
		manager_uids: [...group.manager_uids].sort(),
		conductor_uids: [...group.conductor_uids].sort(),
	})).sort((a, b) => a.group_id.localeCompare(b.group_id));
	return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
};

const mergeScope = (document: FieldServiceDocument, upload: SchedulingScopeUpload | undefined, actor: SchedulingActor, revision: string) => {
	if (!upload) return;
	if (!canManageSchedulingScope(actor)) throw new FieldServiceWriteError('FORBIDDEN');
	if (sameScope(document.scope, upload.groups)) return;
	if (upload.base_revision !== document.scope_revision) throw new FieldServiceWriteError('CONFLICT');
	document.scope = structuredClone(upload.groups);
	document.scope_revision = revision;
};

const isUnchangedMeeting = (current: FieldServiceMeetingRecord | undefined, incoming: FieldServiceMeetingRecord) => {
	if (!current || incoming.authorization.updatedAt !== current.authorization.updatedAt) return false;
	if (JSON.stringify(incoming.authorization) !== JSON.stringify(current.authorization)) throw new FieldServiceWriteError('CONFLICT');
	return true;
};

const assertMeetingAccess = (document: FieldServiceDocument, record: FieldServiceMeetingRecord, current: FieldServiceMeetingRecord | undefined, actor: SchedulingActor) => {
	// Check both sides of moves and tombstones; the submitted group cannot redefine ownership.
	if (current && !canManageGroup(actor, current, document)) throw new FieldServiceWriteError('FORBIDDEN');
	if (!canManageGroup(actor, record, document)) throw new FieldServiceWriteError('FORBIDDEN');
};

const mergeMeeting = (document: FieldServiceDocument, record: FieldServiceMeetingRecord, actor: SchedulingActor, revision: string) => {
	const index = document.meetings.findIndex((meeting) => meeting.meeting_uid === record.meeting_uid);
	const current = document.meetings[index];
	assertMeetingAccess(document, record, current, actor);
	if (isUnchangedMeeting(current, record)) return;
	if (record.revision !== current?.revision) throw new FieldServiceWriteError('CONFLICT');
	const restrictedEdit = !canManageAllMeetings(actor) && !record.authorization.deleted;
	if (restrictedEdit && !canUseConductor(record, document)) throw new FieldServiceWriteError('FORBIDDEN');
	const saved = { ...structuredClone(record), revision };
	if (index < 0) document.meetings.push(saved);
	else document.meetings[index] = saved;
	document.meetings_revision = revision;
};

/** Atomic batch: omissions never delete other groups' meetings; stale revisions cannot overwrite. */
export const mergeFieldServiceUpload = (
	current: FieldServiceDocument,
	actor: SchedulingActor,
	meetings: FieldServiceMeetingRecord[] = [],
	scope?: SchedulingScopeUpload,
	createRevision: () => string = () => crypto.randomUUID(),
): FieldServiceDocument => {
	const document = structuredClone(current);
	const revision = createRevision();
	mergeScope(document, scope, actor, revision);
	for (const record of meetings) mergeMeeting(document, record, actor, revision);
	return document;
};
