import type { AppRoleType } from '#domain/users/app-role.js';

export type SchedulingGroup = {
	group_id: string;
	manager_uids: string[];
	conductor_uids: string[];
};

export type SchedulingScopeUpload = {
	base_revision: string;
	groups: SchedulingGroup[];
};

/** Public authority fields are authoritative; meeting_data remains client encrypted. */
export type FieldServiceMeetingRecord = {
	meeting_uid: string;
	revision?: string;
	authorization: {
		group_id?: string;
		category: 0 | 2 | 3;
		conductor: string;
		deleted: boolean;
		updatedAt: string;
	};
	meeting_data: string;
};

export type SchedulingActor = {
	congregationId: string;
	personUid?: string;
	roles: readonly AppRoleType[];
};

export type FieldServiceDocument = {
	scope: SchedulingGroup[];
	scope_revision: string;
	meetings: FieldServiceMeetingRecord[];
	meetings_revision: string;
};

export class FieldServiceWriteError extends Error {
	constructor(public readonly code: 'FORBIDDEN' | 'CONFLICT') {
		super(`FIELD_SERVICE_${code}`);
		this.name = 'FieldServiceWriteError';
	}
}

export type FieldServiceMeetingReceipt = {
	meeting_uid: string;
	base_revision?: string;
	revision: string;
	updatedAt: string;
};
