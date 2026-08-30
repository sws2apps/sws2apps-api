import type { User } from '../users/user.js';
import type { UserSession } from '../users/user.types.js';
import { UsersList } from '../users/users.js';

type UserSessionLookup = {
	findByAuthUid(authenticationUserId: string): User | undefined;
	findByVisitorId(visitorId: string): User | undefined;
};

type AuthenticatedSessionResolution =
	| { status: 'authenticated'; user: User; session: UserSession }
	| { status: 'session-not-found'; user: User }
	| { status: 'user-not-found' };

export const resolveAuthenticatedSession = (
	authenticationUserId: string,
	visitorId: string,
	users: UserSessionLookup = UsersList,
): AuthenticatedSessionResolution => {
	const user = users.findByAuthUid(authenticationUserId);
	if (!user) return { status: 'user-not-found' };

	const session = user.sessions.find((candidate) => candidate.visitorid === visitorId);
	if (!session) return { status: 'session-not-found', user };

	return { status: 'authenticated', user, session };
};

export const resolvePocketSessionUser = (
	visitorId: string,
	users: UserSessionLookup = UsersList,
): User | undefined => {
	return users.findByVisitorId(visitorId);
};
