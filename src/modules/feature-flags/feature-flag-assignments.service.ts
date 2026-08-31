import type { Congregation } from '../congregations/congregation.js';
import { setCongregationFlags } from '../congregations/congregation-settings.repository.js';
import type { User } from '../users/user.js';
import { setUserFlags } from '../users/user-account.repository.js';

export const toggleFeatureFlagAssignment = (
	assignedFlags: string[],
	flagId: string,
): string[] => {
	if (assignedFlags.includes(flagId)) {
		return assignedFlags.filter((assignedFlagId) => assignedFlagId !== flagId);
	}

	return [...assignedFlags, flagId];
};

export const assignFeatureFlag = (
	assignedFlags: string[],
	flagId: string,
): string[] => {
	if (assignedFlags.includes(flagId)) return [...assignedFlags];

	return [...assignedFlags, flagId];
};

export const removeFeatureFlagAssignment = (
	assignedFlags: string[],
	flagId: string,
): string[] => {
	return assignedFlags.filter((assignedFlagId) => assignedFlagId !== flagId);
};

export const saveUserFeatureFlags = async (
	user: User,
	flags: string[],
): Promise<void> => {
	await setUserFlags(user.id, flags);
	user.flags = flags;
};

export const saveCongregationFeatureFlags = async (
	congregation: Congregation,
	flags: string[],
): Promise<void> => {
	await setCongregationFlags(congregation.id, flags);
	congregation.flags = flags;
};
