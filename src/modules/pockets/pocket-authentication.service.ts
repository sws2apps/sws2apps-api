import type { IncomingHttpHeaders } from 'node:http';

import { getVisitorSessionDetails } from '#modules/auth/index.js';
import type { Congregation } from '#modules/congregations/index.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { refreshCongregationMembers } from '#modules/congregations/index.js';
import type { User } from '#modules/users/index.js';
import type { UserAuthResponse, UserSession } from '#modules/users/index.js';
import { UsersList } from '#modules/users/index.js';
import { updateUserProfile, updateUserSessions } from '#modules/users/index.js';
import { parsePocketInvitationCode } from './invitation-code.js';
import { decryptPocketAccessCode } from './pocket-invitation.service.js';
import { decryptData } from '#platform/encryption/encryption.js';

export type PocketAuthenticationErrorCode = 'INVALID_INVITATION' | 'CONGREGATION_NOT_FOUND';

export class PocketAuthenticationError extends Error {
	constructor(public readonly code: PocketAuthenticationErrorCode) {
		super(code);
		this.name = 'PocketAuthenticationError';
	}
}

const buildPocketAuthenticationResponse = (
	user: User,
	congregation: Congregation,
	message?: string,
): UserAuthResponse => {
	const response: UserAuthResponse = {
		message,
		id: user.id,
		app_settings: {
			user_settings: {
				firstname: user.profile.firstname,
				lastname: user.profile.lastname,
				role: user.profile.role,
				user_local_uid: user.profile.congregation!.user_local_uid,
				cong_role: user.profile.congregation!.cong_role,
				user_members_delegate: user.profile.congregation!.user_members_delegate,
			},
		},
	};

	response.app_settings.cong_settings = {
		id: user.profile.congregation!.id,
		cong_circuit: congregation.settings.cong_circuit,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		country_code: congregation.settings.country_code,
		cong_access_code: congregation.settings.cong_access_code,
		cong_location: congregation.settings.cong_location,
		midweek_meeting: congregation.settings.midweek_meeting.map(({ type, time, weekday }) => ({
			type,
			time,
			weekday,
		})),
		weekend_meeting: congregation.settings.weekend_meeting.map(({ type, time, weekday }) => ({
			type,
			time,
			weekday,
		})),
	};

	return response;
};

type AuthenticatePocketInvitationInput = {
	invitationCode: string;
	visitorId?: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
};

type PocketAuthenticationDependencies = {
	getSessionDetails: typeof getVisitorSessionDetails;
	updateProfile: typeof updateUserProfile;
	updateSessions: typeof updateUserSessions;
	createIdentifier: () => string;
	getCurrentTime: () => Date;
};

const defaultPocketAuthenticationDependencies: PocketAuthenticationDependencies = {
	getSessionDetails: getVisitorSessionDetails,
	updateProfile: updateUserProfile,
	updateSessions: updateUserSessions,
	createIdentifier: () => crypto.randomUUID(),
	getCurrentTime: () => new Date(),
};

const findPocketInvitationUser = (
	congregation: Congregation,
	invitationCode: string,
	accessCode: string,
) => {
	return congregation.members.find((member) => {
		const encryptedInvitation = member.profile.congregation?.pocket_invitation_code;
		if (!encryptedInvitation) return false;

		const invitation = decryptData(encryptedInvitation);
		if (!invitation) return false;

		const invitationCodeData = decryptData(invitation, accessCode);
		if (!invitationCodeData) return false;

		return invitationCode === JSON.parse(invitationCodeData);
	});
};

export const authenticatePocketInvitation = async ({
	invitationCode,
	visitorId,
	visitorIp,
	headers,
}: AuthenticatePocketInvitationInput,
dependencies: Partial<PocketAuthenticationDependencies> = {},
) => {
	const operations = { ...defaultPocketAuthenticationDependencies, ...dependencies };
	const invitation = parsePocketInvitationCode(invitationCode);

	if (!invitation) throw new PocketAuthenticationError('INVALID_INVITATION');

	const congregation = CongregationsList.findByCountryAndPrefix(
		invitation.countryCode,
		invitation.congregationPrefix,
	);

	if (!congregation) throw new PocketAuthenticationError('INVALID_INVITATION');

	const decryptedInvitation = decryptPocketAccessCode(
		congregation.settings.cong_access_code,
		invitation.temporaryAccessCode,
	);

	if (!decryptedInvitation) throw new PocketAuthenticationError('INVALID_INVITATION');

	const user = findPocketInvitationUser(congregation, invitationCode, decryptedInvitation.accessCode);

	if (!user) throw new PocketAuthenticationError('INVALID_INVITATION');

	const authenticatedVisitorId = visitorId || operations.createIdentifier();
	const profile = structuredClone(user.profile);
	profile.congregation!.pocket_invitation_code = undefined;
	await operations.updateProfile(user, profile);

	const sessions = user.sessions?.filter((session) => session.visitorid !== authenticatedVisitorId) || [];
	const newSession: UserSession = {
		mfaVerified: false,
		last_seen: operations.getCurrentTime().toISOString(),
		visitorid: authenticatedVisitorId,
		visitor_details: await operations.getSessionDetails(visitorIp, headers),
		identifier: operations.createIdentifier(),
	};
	sessions.push(newSession);
	await operations.updateSessions(user, sessions);

	refreshCongregationMembers(congregation);

	return {
		visitorId: authenticatedVisitorId,
		userInfo: buildPocketAuthenticationResponse(user, congregation, 'TOKEN_VALID'),
	};
};

export const validatePocketSession = (userId: string): UserAuthResponse => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;
	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;

	if (!congregation) throw new PocketAuthenticationError('CONGREGATION_NOT_FOUND');

	return buildPocketAuthenticationResponse(user, congregation);
};
