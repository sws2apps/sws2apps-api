export type AuthenticationErrorCode = 'USER_NOT_FOUND' | 'OTP_NOT_FOUND' | 'INVALID_OTP';

export class AuthenticationError extends Error {
	constructor(public readonly code: AuthenticationErrorCode) {
		super(code);
		this.name = 'AuthenticationError';
	}
}

