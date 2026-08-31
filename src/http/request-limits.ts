/** Maximum lengths for untrusted strings before they reach application services. */
export const REQUEST_LIMITS = Object.freeze({
	email: 254,
	identifier: 256,
	securityValue: 4_096,
	messageSubject: 200,
	messageBody: 5_000,
});
