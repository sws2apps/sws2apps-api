export type PartnerRequest = {
	request_uid: string;
	request_data: {
		person_uid: string;
		date: string;
		flexible: boolean;
		start?: string;
		end?: string;
		type: number;
		comment: string;
		partner_uid?: string;
		arranged_at?: string;
		updatedAt: string;
		_deleted: boolean;
	};
};

export type PartnerMutation = {
	operationId: string;
	action: 'create' | 'edit' | 'join' | 'cancel' | 'delete';
	request: PartnerRequest;
	withdrawRequestIds?: string[];
};

export type PartnerState = {
	requests: PartnerRequest[];
	receipts: { id: string; actor: string; fingerprint: string; result: PartnerRequest[] }[];
};

export class PartnerError extends Error {
	constructor(public readonly code: 'PARTNER_FORBIDDEN' | 'PARTNER_INVALID' | 'PARTNER_CONFLICT' | 'PARTNER_LIMIT', public readonly status: number) {
		super(code);
	}
}
