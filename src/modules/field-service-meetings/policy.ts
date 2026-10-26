import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import type {
	FieldServiceDocument,
	FieldServiceMeetingRecord,
	SchedulingActor,
	SchedulingScopeUpload,
} from './types.js';
import { FieldServiceWriteError } from './types.js';

const canManageSchedulingScope = (actor: SchedulingActor): boolean => {
	return getUserCapabilities(actor.roles).serviceCommiteeRole;
};

const canManageAllMeetings = (actor: SchedulingActor): boolean => {
	return getUserCapabilities(actor.roles).fieldServiceAllGroups;
};

const canManageGroup = (
	actor: SchedulingActor,
	record: FieldServiceMeetingRecord,
	document: FieldServiceDocument,
): boolean => {
	if (canManageAllMeetings(actor)) return true;
	const { fieldServiceScheduler } = getUserCapabilities(actor.roles);
	const { personUid } = actor;
	if (!fieldServiceScheduler || record.authorization.category !== 0 || !personUid) return false;

	return document.scope.some((group) => {
		return group.group_id === record.authorization.group_id && group.manager_uids.includes(personUid);
	});
};

const canUseConductor = (
	record: FieldServiceMeetingRecord,
	document: FieldServiceDocument,
): boolean => {
	return document.scope.some((group) => {
		return group.group_id === record.authorization.group_id
			&& group.conductor_uids.includes(record.authorization.conductor);
	});
};

const canonicalizeScope = (groups: FieldServiceDocument['scope']) => {
	return groups.map((group) => ({
		group_id: group.group_id,
		manager_uids: [...group.manager_uids].sort((a, b) => a.localeCompare(b)),
		conductor_uids: [...group.conductor_uids].sort((a, b) => a.localeCompare(b)),
	})).sort((a, b) => a.group_id.localeCompare(b.group_id));
};

const sameScope = (left: FieldServiceDocument['scope'], right: FieldServiceDocument['scope']) => {
	return JSON.stringify(canonicalizeScope(left)) === JSON.stringify(canonicalizeScope(right));
};

const mergeScope = (
	document: FieldServiceDocument,
	upload: SchedulingScopeUpload | undefined,
	actor: SchedulingActor,
	revision: string,
): void => {
	if (!upload) return;
	if (!canManageSchedulingScope(actor)) throw new FieldServiceWriteError('FORBIDDEN');
	if (sameScope(document.scope, upload.groups)) return;
	if (upload.base_revision !== document.scope_revision) throw new FieldServiceWriteError('CONFLICT');
	document.scope = structuredClone(upload.groups);
	document.scope_revision = revision;
};

const sameAuthority = (
	incoming: FieldServiceMeetingRecord['authorization'],
	existing?: FieldServiceMeetingRecord['authorization'],
): boolean => {
	return incoming.group_id === existing?.group_id
		&& incoming.category === existing?.category
		&& incoming.conductor === existing?.conductor
		&& incoming.deleted === existing?.deleted;
};

const isUnchangedMeeting = (
	current: FieldServiceMeetingRecord | undefined,
	incoming: FieldServiceMeetingRecord,
): boolean => {
	const authority = current?.authorization;
	if (incoming.authorization.updatedAt !== authority?.updatedAt) return false;
	if (!sameAuthority(incoming.authorization, authority)) throw new FieldServiceWriteError('CONFLICT');
	return true;
};

const assertMeetingAccess = (
	document: FieldServiceDocument,
	record: FieldServiceMeetingRecord,
	current: FieldServiceMeetingRecord | undefined,
	actor: SchedulingActor,
): void => {
	// Check both sides of moves and tombstones; the submitted group cannot redefine ownership.
	if (current && !canManageGroup(actor, current, document)) throw new FieldServiceWriteError('FORBIDDEN');
	if (!canManageGroup(actor, record, document)) throw new FieldServiceWriteError('FORBIDDEN');
};

const mergeMeeting = (
	document: FieldServiceDocument,
	record: FieldServiceMeetingRecord,
	actor: SchedulingActor,
	revision: string,
): void => {
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
