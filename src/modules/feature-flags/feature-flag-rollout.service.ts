import { CongregationsList } from '#modules/congregations/index.js';
import {
	type InstallationItem,
	InstallationsList,
	touchInstallation,
} from '#modules/installations/index.js';
import { UsersList } from '#modules/users/index.js';
import {
	assignFeatureFlag,
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
} from './feature-flag-assignments.service.js';
import {
	registerFeatureFlagInstallation,
	touchFeatureFlagInstallation,
} from './feature-flags.service.js';
import { Flags } from './flags.js';
import type { Flag } from './flag.js';

type FeatureFlagRolloutOperations = {
	registerFeatureFlagInstallation: typeof registerFeatureFlagInstallation;
	saveCongregationFeatureFlags: typeof saveCongregationFeatureFlags;
	saveUserFeatureFlags: typeof saveUserFeatureFlags;
	touchInstallation: typeof touchInstallation;
	touchFeatureFlagInstallation: typeof touchFeatureFlagInstallation;
};

const defaultRolloutOperations: FeatureFlagRolloutOperations = {
	registerFeatureFlagInstallation,
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
	touchInstallation,
	touchFeatureFlagInstallation,
};

const addApplicationFlag = async (
	flag: Flag,
	enabledFeatureFlags: Record<string, boolean>,
	installation: InstallationItem | undefined,
	installationId: string,
	installationCount: number,
	operations: FeatureFlagRolloutOperations,
): Promise<void> => {
	if (flag.coverage === 100) {
		enabledFeatureFlags[flag.name] = flag.status;
		return;
	}

	if (flag.coverage === 0) return;

	if (installation?.status !== 'linked') return;

	const installationAlreadyIncluded = flag.installations.some(
		(installation) => installation.id === installationId,
	);

	if (installationAlreadyIncluded) {
		enabledFeatureFlags[flag.name] = flag.status;
		await operations.touchFeatureFlagInstallation(flag, installationId);
	}

	if (!installationAlreadyIncluded) {
		const currentCoverage =
			(flag.installations.length * 100) / installationCount;

		if (currentCoverage < flag.coverage) {
			enabledFeatureFlags[flag.name] = flag.status;
			await operations.registerFeatureFlagInstallation(flag, {
				id: installationId,
				last_handshake: new Date().toISOString(),
			});
		}
	}
};

const addCongregationFlag = async (
	flag: Flag,
	enabledFeatureFlags: Record<string, boolean>,
	userId: string,
	congregationCount: number,
	operations: FeatureFlagRolloutOperations,
): Promise<void> => {
	const user = UsersList.findById(userId);
	const congregationId = user?.profile.congregation?.id;
	const congregation = congregationId
		? CongregationsList.findById(congregationId)
		: undefined;

	if (!congregation) return;

	const congregationHasFlag = congregation.flags.includes(flag.id);

	if (congregationHasFlag) {
		enabledFeatureFlags[flag.name] = true;
	}

	if (!congregationHasFlag && flag.coverage === 100) {
		enabledFeatureFlags[flag.name] = true;

		const assignedFlags = assignFeatureFlag(congregation.flags, flag.id);
		await operations.saveCongregationFeatureFlags(congregation, assignedFlags);
	}

	if (!congregationHasFlag && flag.coverage > 0 && flag.coverage < 100) {
		const assignedCongregationCount = CongregationsList.list.filter(
			(record) => record.flags.includes(flag.id),
		).length;
		const currentCoverage =
			(assignedCongregationCount * 100) / congregationCount;

		if (currentCoverage < flag.coverage) {
			enabledFeatureFlags[flag.name] = flag.status;

			const assignedFlags = assignFeatureFlag(congregation.flags, flag.id);
			await operations.saveCongregationFeatureFlags(congregation, assignedFlags);
		}
	}
};

const addUserFlag = async (
	flag: Flag,
	enabledFeatureFlags: Record<string, boolean>,
	userId: string,
	nonAdminUserCount: number,
	operations: FeatureFlagRolloutOperations,
): Promise<void> => {
	const user = UsersList.findById(userId);

	if (!user) return;

	const userHasFlag = user.flags.includes(flag.id);

	if (userHasFlag) {
		enabledFeatureFlags[flag.name] = true;
	}

	if (!userHasFlag && flag.coverage === 100) {
		enabledFeatureFlags[flag.name] = true;

		const assignedFlags = assignFeatureFlag(user.flags, flag.id);
		await operations.saveUserFeatureFlags(user, assignedFlags);
	}

	if (!userHasFlag && flag.coverage > 0 && flag.coverage < 100) {
		const assignedUserCount = UsersList.list.filter((record) => {
			return record.flags.includes(flag.id);
		}).length;
		const currentCoverage = (assignedUserCount * 100) / nonAdminUserCount;

		if (currentCoverage < flag.coverage) {
			enabledFeatureFlags[flag.name] = flag.status;

			const assignedFlags = assignFeatureFlag(user.flags, flag.id);
			await operations.saveUserFeatureFlags(user, assignedFlags);
		}
	}
};

const collectEnabledFeatureFlags = async (
	installationId: string,
	enabledFeatureFlags: Record<string, boolean>,
	operations: FeatureFlagRolloutOperations,
): Promise<void> => {
	if (installationId.length === 0) return;

	const activeFlags = Flags.list.filter((flag) => flag.status);
	const nonAdminUserCount = UsersList.list.filter(
		(user) => user.profile.role !== 'admin',
	).length;
	const congregationCount = CongregationsList.list.length;
	const installation = InstallationsList.find(installationId);
	const installationCount = InstallationsList.linkedCount;
	const userId = installation?.user;

	for (const flag of activeFlags) {
		if (flag.availability === 'app') {
			await addApplicationFlag(flag, enabledFeatureFlags, installation, installationId, installationCount, operations);
			continue;
		}

		if (!userId) continue;

		if (flag.availability === 'congregation') {
			await addCongregationFlag(flag, enabledFeatureFlags, userId, congregationCount, operations);
		}

		if (flag.availability === 'user') {
			await addUserFlag(flag, enabledFeatureFlags, userId, nonAdminUserCount, operations);
		}
	}

	await operations.touchInstallation(installationId);
};

export const getPublicFeatureFlags = async (
	installationId: string,
	operations: FeatureFlagRolloutOperations = defaultRolloutOperations,
): Promise<Record<string, boolean>> => {
	const enabledFeatureFlags: Record<string, boolean> = {};

	await collectEnabledFeatureFlags(installationId, enabledFeatureFlags, operations);

	return enabledFeatureFlags;
};
