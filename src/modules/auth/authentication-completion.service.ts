import type { IncomingHttpHeaders } from 'node:http';

import { env } from '#config/env.js';
import { generateDevelopmentMfaToken } from '#modules/mfa/index.js';
import { createApplicationUser } from '#modules/users/index.js';
import { UsersList } from '#modules/users/index.js';
import { AuthenticationError } from './authentication-error.js';
import { getAuthenticationUserDisplayName } from './authentication-identity.service.js';
import { buildUserAuthenticationResponse } from './authentication-response.js';
import { createAuthenticationSession } from './authentication-session.service.js';

type CompleteAuthenticationInput = {
	authenticationUserId: string;
	visitorId: string;
	visitorIp: string;
	headers: IncomingHttpHeaders;
	createUserWhenMissing?: boolean;
};

export const completeAuthentication = async (input: CompleteAuthenticationInput) => {
	let user = UsersList.findByAuthUid(input.authenticationUserId);

	if (!user && input.createUserWhenMissing) {
		const displayName = await getAuthenticationUserDisplayName(input.authenticationUserId);
		const names = displayName.length > 0 ? displayName.split(' ') : [];
		const lastname = names.pop() || '';
		const firstname = names.join(' ');

		user = await createApplicationUser({
			auth_uid: input.authenticationUserId,
			firstname,
			lastname,
		});
	}

	if (!user) throw new AuthenticationError('USER_NOT_FOUND');

	await createAuthenticationSession({
		userId: user.id,
		visitorId: input.visitorId,
		visitorIp: input.visitorIp,
		headers: input.headers,
		mfaVerified: false,
	});

	if (user.profile.mfa_enabled) {
		const developmentMfaCode = env.isDevelopment
			? generateDevelopmentMfaToken(user.email!, user.profile.secret!)
			: undefined;

		return {
			requiresMfa: true as const,
			developmentMfaCode,
		};
	}

	return {
		requiresMfa: false as const,
		userInfo: buildUserAuthenticationResponse({ authUser: user }),
	};
};
