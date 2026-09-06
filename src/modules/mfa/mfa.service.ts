import * as OTPAuth from 'otpauth';
import { env } from '#config/env.js';
import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import { CongregationsList } from '#modules/congregations/index.js';
import {
	type UserAuthResponse,
	type UserSession,
	UsersList,
	updateUserSessions,
} from '#modules/users/index.js';
import { isTokenWithinAllowedWindow } from './token-validation.js';
import {
	decryptUserMfaSecret,
	enableUserMfa,
} from './user-mfa.service.js';

export class InvalidMfaTokenError extends Error {
	constructor() {
		super('TOKEN_INVALID');
		this.name = 'InvalidMfaTokenError';
	}
}

export type MfaVerificationContextErrorCode = 'USER_NOT_FOUND' | 'SESSION_NOT_FOUND';

export class MfaVerificationContextError extends Error {
	constructor(public readonly code: MfaVerificationContextErrorCode) {
		super(code);
		this.name = 'MfaVerificationContextError';
	}
}

type VerifyMfaTokenInput = {
	userId: string;
	sessions: UserSession[];
	visitorId: string;
	token: string;
};

type MfaVerificationDependencies = {
	findUserById: typeof UsersList.findById;
	enableMfa: typeof enableUserMfa;
	saveSessions: typeof updateUserSessions;
	getCurrentTime: () => Date;
};

const defaultMfaVerificationDependencies: MfaVerificationDependencies = {
	findUserById: (userId) => UsersList.findById(userId),
	enableMfa: enableUserMfa,
	saveSessions: updateUserSessions,
	getCurrentTime: () => new Date(),
};

export const verifyMfaToken = async ({
	userId,
	sessions,
	visitorId,
	token,
}: VerifyMfaTokenInput,
dependencies: Partial<MfaVerificationDependencies> = {},
): Promise<UserAuthResponse> => {
	const operations = { ...defaultMfaVerificationDependencies, ...dependencies };
	const user = operations.findUserById(userId);
	if (!user) throw new MfaVerificationContextError('USER_NOT_FOUND');

	const updatedSessions = structuredClone(sessions);
	const currentSession = updatedSessions.find((session) => session.visitorid === visitorId);
	if (!currentSession) throw new MfaVerificationContextError('SESSION_NOT_FOUND');

	const encryptedSecret = decryptUserMfaSecret(user);
	const tokenGenerator = new OTPAuth.TOTP({
		issuer: env.isProduction ? 'Organized' : 'Organized-dev',
		label: user.email,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(encryptedSecret.secret),
	});
	const timeStepDifference = tokenGenerator.validate({ token, window: 1 });

	if (!isTokenWithinAllowedWindow(timeStepDifference)) {
		throw new InvalidMfaTokenError();
	}

	currentSession.last_seen = operations.getCurrentTime().toISOString();
	currentSession.mfaVerified = true;

	await operations.enableMfa(user);
	await operations.saveSessions(user, updatedSessions);

	const userInfo: UserAuthResponse = {
		message: 'TOKEN_VALID',
		id: user.id,
		app_settings: {
			user_settings: {
				firstname: user.profile.firstname,
				lastname: user.profile.lastname,
				role: user.profile.role,
				mfa: 'enabled',
			},
		},
	};

	const membership = user.profile.congregation;
	const congregationId = membership?.id;

	if (!congregationId) {
		return userInfo;
	}

	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		return userInfo;
	}

	const congregationRoles = membership.cong_role;
	const needsMasterKey = canAccessCongregationMasterKey(congregationRoles);
	const midweekMeeting = congregation.settings.midweek_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));
	const weekendMeeting = congregation.settings.weekend_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));

	userInfo.app_settings.user_settings.user_local_uid = membership.user_local_uid;
	userInfo.app_settings.user_settings.user_members_delegate = membership.user_members_delegate;
	userInfo.app_settings.user_settings.cong_role = congregationRoles;
	userInfo.app_settings.cong_settings = {
		id: congregationId,
		cong_circuit: congregation.settings.cong_circuit,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
		cong_access_code: congregation.settings.cong_access_code,
		cong_master_key: needsMasterKey ? congregation.settings.cong_master_key : undefined,
		cong_location: congregation.settings.cong_location,
		midweek_meeting: midweekMeeting,
		weekend_meeting: weekendMeeting,
	};

	return userInfo;
};
