import * as OTPAuth from 'otpauth';

import { env } from '../../config/env.js';
import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { CongregationsList } from '../congregations/congregations.js';
import type { UserAuthResponse, UserSession } from '../users/user.types.js';
import { UsersList } from '../users/users.js';
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

type VerifyMfaTokenInput = {
	userId: string;
	sessions: UserSession[];
	visitorId: string;
	token: string;
};

export const verifyMfaToken = async ({
	userId,
	sessions,
	visitorId,
	token,
}: VerifyMfaTokenInput): Promise<UserAuthResponse> => {
	const user = UsersList.findById(userId)!;
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

	const updatedSessions = structuredClone(sessions);
	const currentSession = updatedSessions.find((session) => session.visitorid === visitorId)!;
	currentSession.last_seen = new Date().toISOString();
	currentSession.mfaVerified = true;

	await enableUserMfa(user);
	await user.updateSessions(updatedSessions);

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

	const congregationId = user.profile.congregation?.id;

	if (!congregationId) {
		return userInfo;
	}

	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		return userInfo;
	}

	const congregationRoles = user.profile.congregation!.cong_role;
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

	userInfo.app_settings.user_settings.user_local_uid = user.profile.congregation!.user_local_uid;
	userInfo.app_settings.user_settings.user_members_delegate = user.profile.congregation!.user_members_delegate;
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
