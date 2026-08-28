export type PocketInvitationDetails = {
	countryCode: string;
	congregationPrefix: string;
	temporaryAccessCode: string;
};

export const parsePocketInvitationCode = (invitationCode: string): PocketInvitationDetails | undefined => {
	const invitationParts = /^(.+?)-(.+?)-(.+?)$/.exec(invitationCode);
	if (!invitationParts) return;

	const congregationIdentity = invitationParts[1];
	const temporaryAccessCode = invitationParts[3];
	if (congregationIdentity.length <= 3) return;

	return {
		countryCode: congregationIdentity.slice(0, 3),
		congregationPrefix: congregationIdentity.slice(3),
		temporaryAccessCode,
	};
};
