import type { IncomingHttpHeaders } from 'node:http';

import { env } from '#config/env.js';
import { generateDevelopmentMfaToken } from '#modules/mfa/index.js';
import {
	createApplicationUser,
	UsersList,
	type User,
	type UserNewParams,
} from '#modules/users/index.js';
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

type AuthenticationCompletionDependencies = {
	findUserByAuthenticationId: (authenticationUserId: string) => User | undefined;
	getAuthenticationDisplayName: typeof getAuthenticationUserDisplayName;
	createUser: (params: UserNewParams) => Promise<User>;
	createSession: typeof createAuthenticationSession;
	createDevelopmentMfaToken: typeof generateDevelopmentMfaToken;
	isDevelopment: boolean;
};

const defaultAuthenticationCompletionDependencies: AuthenticationCompletionDependencies = {
	findUserByAuthenticationId: (authenticationUserId) => {
		return UsersList.findByAuthUid(authenticationUserId);
	},
	getAuthenticationDisplayName: getAuthenticationUserDisplayName,
	createUser: createApplicationUser,
	createSession: createAuthenticationSession,
	createDevelopmentMfaToken: generateDevelopmentMfaToken,
	isDevelopment: env.isDevelopment,
};

export const completeAuthentication = async (
	input: CompleteAuthenticationInput,
	dependencies: Partial<AuthenticationCompletionDependencies> = {},
) => {
	const {
		findUserByAuthenticationId,
		getAuthenticationDisplayName,
		createUser,
		createSession,
		createDevelopmentMfaToken,
		isDevelopment,
	} = {
		...defaultAuthenticationCompletionDependencies,
		...dependencies,
	};
	let user = findUserByAuthenticationId(input.authenticationUserId);

	if (!user && input.createUserWhenMissing) {
		const displayName = await getAuthenticationDisplayName(input.authenticationUserId);
		const names = displayName.length > 0 ? displayName.split(' ') : [];
		const lastname = names.pop() || '';
		const firstname = names.join(' ');

		user = await createUser({
			auth_uid: input.authenticationUserId,
			firstname,
			lastname,
		});
	}

	if (!user) throw new AuthenticationError('USER_NOT_FOUND');

	await createSession({
		userId: user.id,
		visitorId: input.visitorId,
		visitorIp: input.visitorIp,
		headers: input.headers,
		mfaVerified: false,
	});

	if (user.profile.mfa_enabled) {
		const developmentMfaCode = isDevelopment
			? createDevelopmentMfaToken(user.email!, user.profile.secret!)
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
