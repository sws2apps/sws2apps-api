import {
	createFirebaseCustomToken,
	getFirebaseUserDisplayName,
	verifyFirebaseIdToken,
} from '../../platform/firebase/authentication.js';
import type { IncomingHttpHeaders } from 'node:http';
import { retrieveVisitorDetails } from '../../platform/visitor-details/visitor-details.js';
import { UsersList } from '../users/users.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';

export const verifyAuthenticationToken = async (
	idToken: string,
): Promise<string | undefined> => {
	return verifyFirebaseIdToken(idToken);
};

export const getAuthenticationUserDisplayName = async (
	authenticationUserId: string,
): Promise<string> => {
	return getFirebaseUserDisplayName(authenticationUserId);
};

export const createAuthenticationToken = async (
	authenticationUserId: string,
): Promise<string> => {
	return createFirebaseCustomToken(authenticationUserId);
};

export const getVisitorSessionDetails = async (
	visitorIp: string,
	requestHeaders: IncomingHttpHeaders,
) => {
	return retrieveVisitorDetails(visitorIp, requestHeaders);
};

type PasswordlessSignInRequest = {
	email: string;
	origin: string;
	emailContent: {
		subject: string;
		title: string;
		description: string;
		loginButtonLabel: string;
		alternativeLinkText: string;
		ignoreRequestText: string;
		oneTimePasswordLabel: string;
		oneTimePasswordDurationText: string;
	};
};

export const createPasswordlessSignIn = async (request: PasswordlessSignInRequest) => {
	const { link, otp } = await UsersList.generatePasswordLessLink({
		email: request.email,
		origin: request.origin,
	});
	const emailEnabled = isPasswordlessEmailEnabled();

	if (emailEnabled) {
		sendPasswordlessLoginEmail({
			recipient: request.email,
			loginLink: link,
			oneTimePassword: otp,
			...request.emailContent,
		});
	}

	return { emailEnabled, link, otp };
};

type CreateAuthenticationSessionInput = {
	userId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	mfaVerified: boolean;
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

	await user.updateSessions(sessions);
};
