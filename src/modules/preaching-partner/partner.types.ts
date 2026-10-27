export type PartnerRequest = {
	request_uid: string;
	request_data: {
		person_uid: string;
		date: string;
		// Client-encrypted with the congregation access code; opaque to the API.
		flexible: string;
		start?: string;
		end?: string;
		type: string;
		comment: string;
		partner_uid?: string;
		arranged_at?: string;
		updatedAt: string;
		_deleted: boolean;
	};
};

export type PartnerMutation = {
	publisher_uid: string;
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

/** AES ciphertext in the OpenSSL salted format the Organized client produces. */
export const PARTNER_SEALED = /^U2FsdGVkX1[A-Za-z0-9+/]*={0,2}$/;
export const PARTNER_SEALED_LIMITS = Object.freeze({ detail: 256, comment: 48_000 });
