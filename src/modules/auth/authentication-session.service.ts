import type { IncomingHttpHeaders } from 'node:http';

import { retrieveVisitorDetails } from '#platform/visitor-details/visitor-details.js';
import { UsersList } from '#modules/users/index.js';
import { updateUserSessions } from '#modules/users/index.js';

export const getVisitorSessionDetails = async (
	visitorIp: string,
	requestHeaders: IncomingHttpHeaders,
) => {
	return retrieveVisitorDetails(visitorIp, requestHeaders);
};

type CreateAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	mfaVerified: boolean;
};

type RefreshAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
};

export const refreshAuthenticationSession = async (
	input: RefreshAuthenticationSessionInput,
): Promise<void> => {
	const user = UsersList.findById(input.userId)!;
	const sessions = structuredClone(user.sessions);
	const session = sessions.find((record) => record.visitorid === input.visitorId)!;

	session.last_seen = new Date().toISOString();
	session.visitor_details = await getVisitorSessionDetails(input.visitorIp, input.headers);

	await updateUserSessions(user, sessions);
};

export const createAuthenticationSession = async (input: CreateAuthenticationSessionInput): Promise<void> => {
	const user = UsersList.findById(input.userId)!;
	const sessions = user.sessions?.filter((session) => session.visitorid !== input.visitorId) || [];

	sessions.push({
		mfaVerified: input.mfaVerified,
		last_seen: new Date().toISOString(),
		visitorid: input.visitorId,
		visitor_details: await getVisitorSessionDetails(input.visitorIp, input.headers),
		identifier: crypto.randomUUID(),
	});

	await updateUserSessions(user, sessions);
};
