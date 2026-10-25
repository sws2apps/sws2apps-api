import type { AppRoleType } from '#domain/users/app-role.js';

export type TerritoryActor = {
	congregationId: string;
	personId?: string;
	roles: AppRoleType[];
};

export type TerritoryGrant = {
	personId: string;
	eligible: boolean;
	access: 'own' | 'view' | 'request';
	groupIds: string[];
	dataViews: string[];
	restrictedCategories: string[];
	restrictedTypes: string[];
};

export type TerritoryPolicy = {
	revision: number;
	grants: TerritoryGrant[];
	/** Encrypted congregation settings; eligibility and scope are never read from this payload. */
	content: string;
};

export type TerritoryAssignment = {
	id: string;
	personId: string;
	groupId?: string;
	campaignId?: string;
	assignedAt: string;
	returnedAt?: string;
	completed?: boolean;
	/** Client-encrypted assignment notes, separate from permanent territory content. */
	notes?: string;
};

export type TerritoryRecord = {
	id: string;
	dataView: string;
	revision: number;
	updatedAt: string;
	deleted: boolean;
	type: 'door_to_door' | 'business' | 'phone';
	categories: string[];
	cardLost: boolean;
	/** Client-encrypted map and territory details visible to permitted viewers. */
	content: string;
	/** Client-encrypted do-not-call information, disclosed only to the current holder or managers. */
	privateContent: string;
	requestedBy?: string;
	assignment?: TerritoryAssignment;
	history: TerritoryAssignment[];
	doNotCalls: { id: string; addedBy: string; content: string }[];
};

export type TerritoryState = {
	schemaVersion: 1;
	revision: number;
	policy: TerritoryPolicy;
	records: TerritoryRecord[];
};

export type TerritoryDetails = Pick<
	TerritoryRecord,
	'dataView' | 'type' | 'categories' | 'cardLost' | 'content' | 'privateContent'
>;

export type TerritoryCommand = {
	expectedRevision: number;
} & (
	| { action: 'update'; details: TerritoryDetails }
	| { action: 'delete' | 'request' | 'cancel_request' }
	| { action: 'assign'; personId: string; groupId?: string; campaignId?: string; notes?: string }
	| { action: 'return'; completed: boolean; notes?: string }
	| { action: 'assignment_note'; notes: string }
	| { action: 'do_not_call'; entryId: string; content?: string }
);

export class TerritoryError extends Error {
	constructor(
		public readonly code:
			| 'INPUT_INVALID'
			| 'UNAUTHORIZED_ACCESS'
			| 'TERRITORY_CONFLICT'
			| 'TERRITORY_NOT_FOUND'
			| 'TERRITORY_LIMIT_EXCEEDED',
	) {
		super(code);
		this.name = 'TerritoryError';
	}
}
