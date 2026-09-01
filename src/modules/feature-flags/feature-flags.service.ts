import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import type { FeatureFlag } from './feature-flag.js';
import {
	removeFeatureFlagAssignment,
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
} from './feature-flag-assignments.service.js';
import { saveFeatureFlags } from './feature-flags.repository.js';
import { Flag } from './flag.js';
import { Flags } from './flags.js';

export const createFeatureFlag = async (
	name: string,
	description: string,
	availability: FeatureFlag['availability'],
): Promise<void> => {
	const flag = new Flag({
		id: crypto.randomUUID(),
		availability,
		coverage: 0,
		description,
		name: name.toUpperCase(),
		status: false,
		installations: [],
	});

	Flags.list.push(flag);
	await saveFeatureFlags(Flags.list);
};

export const updateFeatureFlag = async (
	flag: Flag,
	name: string,
	description: string,
	coverage: number,
): Promise<void> => {
	flag.name = name;
	flag.description = description;
	flag.coverage = coverage;

	await saveFeatureFlags(Flags.list);
};

export const toggleFeatureFlag = async (flag: Flag): Promise<void> => {
	flag.status = !flag.status;
	await saveFeatureFlags(Flags.list);
};

export const registerFeatureFlagInstallation = async (
	flag: Flag,
	installation: FeatureFlag['installations'][number],
): Promise<void> => {
	flag.installations.push(installation);
	await saveFeatureFlags(Flags.list);
};

export const deleteFeatureFlag = async (flagId: string): Promise<void> => {
	const assignedUsers = UsersList.list.filter((user) => {
		return user.flags.includes(flagId);
	});

	for (const user of assignedUsers) {
		const flags = removeFeatureFlagAssignment(user.flags, flagId);
		await saveUserFeatureFlags(user, flags);
	}

	const assignedCongregations = CongregationsList.list.filter((congregation) => {
		return congregation.flags.includes(flagId);
	});

	for (const congregation of assignedCongregations) {
		const flags = removeFeatureFlagAssignment(congregation.flags, flagId);
		await saveCongregationFeatureFlags(congregation, flags);
	}

	const remainingFlags = Flags.list.filter((flag) => flag.id !== flagId);
	await saveFeatureFlags(remainingFlags);
	Flags.list = remainingFlags;
};
