import type { FieldServiceMeetingRecord, SchedulingScopeUpload } from './types.js';

const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
const identifiers = (value: unknown): value is string[] =>
	Array.isArray(value) && value.length <= 10_000 && value.every(identifier) && new Set(value).size === value.length;

export const isSchedulingScope = (value: unknown): value is SchedulingScopeUpload => {
	if (!object(value) || typeof value.base_revision !== 'string' || !Array.isArray(value.groups)) return false;
	if (value.groups.length > 10_000) return false;
	const valid = value.groups.every((group: unknown) => {
		if (!object(group)) return false;
		return identifier(group.group_id) && identifiers(group.manager_uids) && identifiers(group.conductor_uids);
	});
	return valid && new Set(value.groups.map((group) => group.group_id)).size === value.groups.length;
};

const validAuthority = (authority: Record<string, unknown>) => {
	if (authority.group_id !== undefined && !identifier(authority.group_id)) return false;
	if (typeof authority.category !== 'number' || ![0, 2, 3].includes(authority.category)) return false;
	if (!identifier(authority.conductor) || typeof authority.deleted !== 'boolean') return false;
	return typeof authority.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(authority.updatedAt) && Number.isFinite(Date.parse(authority.updatedAt));
};

export const isFieldServiceMeetingRecord = (value: unknown): value is FieldServiceMeetingRecord => {
	if (!object(value) || !identifier(value.meeting_uid) || !object(value.authorization)) return false;
	if (value.revision !== undefined && !identifier(value.revision)) return false;
	if (typeof value.meeting_data !== 'string' || !value.meeting_data.length) return false;
	return validAuthority(value.authorization);
};

export const hasValidFieldServiceBackup = (backup: Record<string, unknown>): boolean => {
	if (backup.field_service_scheduling !== undefined && !isSchedulingScope(backup.field_service_scheduling)) return false;
	const meetings = backup.field_service_meetings;
	if (meetings === undefined) return true;
	if (!Array.isArray(meetings) || meetings.length > 100_000 || !meetings.every(isFieldServiceMeetingRecord)) return false;
	return new Set(meetings.map((meeting) => meeting.meeting_uid)).size === meetings.length;
};
