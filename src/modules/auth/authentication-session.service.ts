import type { IncomingHttpHeaders } from 'node:http';

import { retrieveVisitorDetails } from '#platform/visitor-details/visitor-details.js';
import {
	UsersList,
	updateUserSessions,
	type User,
	type UserSession,
} from '#modules/users/index.js';

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

type AuthenticationSessionDependencies = {
	findUserById: (userId: string) => User | undefined;
	getVisitorDetails: typeof getVisitorSessionDetails;
	updateSessions: (user: User, sessions: UserSession[]) => Promise<void>;
	getCurrentTime: () => Date;
	createSessionIdentifier: () => string;
};

export type AuthenticationSessionErrorCode = 'USER_NOT_FOUND' | 'SESSION_NOT_FOUND';

export class AuthenticationSessionError extends Error {
	constructor(public readonly code: AuthenticationSessionErrorCode) {
		super(code);
		this.name = 'AuthenticationSessionError';
	}
}

const defaultAuthenticationSessionDependencies: AuthenticationSessionDependencies = {
	findUserById: (userId) => UsersList.findById(userId),
	getVisitorDetails: getVisitorSessionDetails,
	updateSessions: updateUserSessions,
	getCurrentTime: () => new Date(),
	createSessionIdentifier: () => crypto.randomUUID(),
};

export const refreshAuthenticationSession = async (
	input: RefreshAuthenticationSessionInput,
	dependencies: Partial<AuthenticationSessionDependencies> = {},
): Promise<void> => {
	const {
		findUserById,
		getVisitorDetails,
		updateSessions,
		getCurrentTime,
	} = {
		...defaultAuthenticationSessionDependencies,
		...dependencies,
	};
	const user = findUserById(input.userId);
	if (!user) throw new AuthenticationSessionError('USER_NOT_FOUND');

	const sessions = structuredClone(user.sessions);
	const session = sessions.find((record) => record.visitorid === input.visitorId);
	if (!session) throw new AuthenticationSessionError('SESSION_NOT_FOUND');

	session.last_seen = getCurrentTime().toISOString();
	session.visitor_details = await getVisitorDetails(input.visitorIp, input.headers);

	await updateSessions(user, sessions);
};

export const createAuthenticationSession = async (
	input: CreateAuthenticationSessionInput,
	dependencies: Partial<AuthenticationSessionDependencies> = {},
): Promise<void> => {
	const {
		findUserById,
		getVisitorDetails,
		updateSessions,
		getCurrentTime,
		createSessionIdentifier,
	} = {
		...defaultAuthenticationSessionDependencies,
		...dependencies,
	};
	const user = findUserById(input.userId);
	if (!user) throw new AuthenticationSessionError('USER_NOT_FOUND');

	const sessions = user.sessions?.filter(
		(session) => session.visitorid !== input.visitorId,
	) || [];

	sessions.push({
		mfaVerified: input.mfaVerified,
		last_seen: getCurrentTime().toISOString(),
		visitorid: input.visitorId,
		visitor_details: await getVisitorDetails(input.visitorIp, input.headers),
		identifier: createSessionIdentifier(),
	});

	await updateSessions(user, sessions);
};
