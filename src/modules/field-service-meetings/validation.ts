import type { FieldServiceMeetingRecord, SchedulingScopeUpload } from './types.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

const isIdentifier = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0 && value.length <= 256;

const hasUniqueIdentifiers = (value: unknown): value is string[] => {
	if (!Array.isArray(value) || value.length > 10_000) return false;
	return value.every(isIdentifier) && new Set(value).size === value.length;
};

const isSchedulingGroup = (group: unknown): boolean => {
	if (!isObject(group)) return false;
	return isIdentifier(group.group_id)
		&& hasUniqueIdentifiers(group.manager_uids)
		&& hasUniqueIdentifiers(group.conductor_uids);
};

export const isSchedulingScope = (value: unknown): value is SchedulingScopeUpload => {
	if (!isObject(value) || typeof value.base_revision !== 'string' || !Array.isArray(value.groups)) return false;
	if (value.groups.length > 10_000) return false;
	if (!value.groups.every(isSchedulingGroup)) return false;
	return new Set(value.groups.map((group) => group.group_id)).size === value.groups.length;
};

const hasValidAuthority = (authority: Record<string, unknown>): boolean => {
	if (authority.group_id !== undefined && !isIdentifier(authority.group_id)) return false;
	if (typeof authority.category !== 'number' || ![0, 2, 3].includes(authority.category)) return false;
	if (!isIdentifier(authority.conductor) || typeof authority.deleted !== 'boolean') return false;
	return typeof authority.updatedAt === 'string'
		&& /^\d{4}-\d{2}-\d{2}T/.test(authority.updatedAt)
		&& Number.isFinite(Date.parse(authority.updatedAt));
};

export const isFieldServiceMeetingRecord = (value: unknown): value is FieldServiceMeetingRecord => {
	if (!isObject(value) || !isIdentifier(value.meeting_uid) || !isObject(value.authorization)) return false;
	if (value.revision !== undefined && !isIdentifier(value.revision)) return false;
	if (value.content_hash !== undefined && (typeof value.content_hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.content_hash))) return false;
	if (typeof value.meeting_data !== 'string' || !value.meeting_data.length) return false;
	return hasValidAuthority(value.authorization);
};

export const hasValidFieldServiceBackup = (backup: Record<string, unknown>): boolean => {
	const scope = backup.field_service_scheduling;
	if (scope !== undefined && !isSchedulingScope(scope)) return false;
	const meetings = backup.field_service_meetings;
	if (meetings === undefined) return true;
	if (!Array.isArray(meetings) || meetings.length > 100_000) return false;
	if (!meetings.every(isFieldServiceMeetingRecord)) return false;
	return new Set(meetings.map((meeting) => meeting.meeting_uid)).size === meetings.length;
};
