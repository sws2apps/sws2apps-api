export type PocketInvitationDetails = {
	countryCode: string;
	congregationPrefix: string;
	temporaryAccessCode: string;
};

export const parsePocketInvitationCode = (invitationCode: string): PocketInvitationDetails | undefined => {
	if (/[\r\n\u2028\u2029]/.test(invitationCode)) return;

	const firstSeparator = invitationCode.indexOf('-', 1);
	if (firstSeparator <= 3) return;

	// Each segment must contain at least one character; access codes may contain hyphens.
	const secondSeparator = invitationCode.indexOf('-', firstSeparator + 2);
	if (secondSeparator === -1 || secondSeparator === invitationCode.length - 1) return;

	const congregationIdentity = invitationCode.slice(0, firstSeparator);
	const temporaryAccessCode = invitationCode.slice(secondSeparator + 1);

	return {
		countryCode: congregationIdentity.slice(0, 3),
		congregationPrefix: congregationIdentity.slice(3),
		temporaryAccessCode,
	};
};
