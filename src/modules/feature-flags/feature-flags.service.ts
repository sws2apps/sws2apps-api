import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import type { FeatureFlag } from './feature-flag.js';
import {
	removeFeatureFlagAssignment,
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
} from './feature-flag-assignments.service.js';
import { updateFeatureFlagsFile } from './feature-flags.repository.js';
import { Flag } from './flag.js';
import { Flags } from './flags.js';

export type FeatureFlagWriteOperations = {
	updateFeatureFlags: typeof updateFeatureFlagsFile;
	createId: () => string;
};

const defaultWriteOperations: FeatureFlagWriteOperations = {
	updateFeatureFlags: (update) => updateFeatureFlagsFile(update),
	createId: () => crypto.randomUUID(),
};

const replaceFlag = (flags: Flag[], updatedFlag: Flag): Flag[] => {
	return flags.map((flag) => flag.id === updatedFlag.id ? updatedFlag : flag);
};

export const createFeatureFlag = async (
	name: string,
	description: string,
	availability: FeatureFlag['availability'],
	operations: Partial<FeatureFlagWriteOperations> = {},
): Promise<void> => {
	const writeOperations = { ...defaultWriteOperations, ...operations };
	const flag = new Flag({
		id: writeOperations.createId(),
		availability,
		coverage: 0,
		description,
		name: name.toUpperCase(),
		status: false,
		installations: [],
	});

	const next = await writeOperations.updateFeatureFlags(async (currentFlags) => {
		const nextFlags = [...currentFlags, flag];
		return { next: nextFlags, result: nextFlags };
	});

	Flags.list = next;
};

export const updateFeatureFlag = async (
	flag: Flag,
	name: string,
	description: string,
	coverage: number,
	operations: Partial<FeatureFlagWriteOperations> = {},
): Promise<void> => {
	const writeOperations = { ...defaultWriteOperations, ...operations };
	const updatedFlag = new Flag({ ...flag, name, description, coverage });

	const next = await writeOperations.updateFeatureFlags(async (currentFlags) => {
		const nextFlags = replaceFlag(currentFlags, updatedFlag);
		return { next: nextFlags, result: nextFlags };
	});

	Flags.list = next;
	flag.name = updatedFlag.name;
	flag.description = updatedFlag.description;
	flag.coverage = updatedFlag.coverage;
};

export const toggleFeatureFlag = async (
	flag: Flag,
	operations: Partial<FeatureFlagWriteOperations> = {},
): Promise<void> => {
	const writeOperations = { ...defaultWriteOperations, ...operations };
	const updatedFlag = new Flag({ ...flag, status: !flag.status });

	const next = await writeOperations.updateFeatureFlags(async (currentFlags) => {
		const nextFlags = replaceFlag(currentFlags, updatedFlag);
		return { next: nextFlags, result: nextFlags };
	});

	Flags.list = next;
	flag.status = updatedFlag.status;
};

export const registerFeatureFlagInstallation = async (
	flag: Flag,
	installation: FeatureFlag['installations'][number],
	operations: Partial<FeatureFlagWriteOperations> = {},
): Promise<void> => {
	const writeOperations = { ...defaultWriteOperations, ...operations };
	const installations = [...flag.installations, structuredClone(installation)];
	const updatedFlag = new Flag({ ...flag, installations });

	const next = await writeOperations.updateFeatureFlags(async (currentFlags) => {
		const nextFlags = replaceFlag(currentFlags, updatedFlag);
		return { next: nextFlags, result: nextFlags };
	});

	Flags.list = next;
	flag.installations = installations;
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

	const next = await updateFeatureFlagsFile(async (currentFlags) => {
		const nextFlags = currentFlags.filter((flag) => flag.id !== flagId);
		return { next: nextFlags, result: nextFlags };
	});

	Flags.list = next;
};
