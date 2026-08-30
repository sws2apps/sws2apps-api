import { CongregationsList } from '../congregations/congregations.js';
import { InstallationsList } from '../installations/installation-list.js';
import { registerInstallation } from '../installations/installations.service.js';
import { UsersList } from '../users/users.js';
import {
	assignFeatureFlag,
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
} from './feature-flag-assignments.service.js';
import { registerFeatureFlagInstallation } from './feature-flags.service.js';
import { Flags } from './flags.js';

export const getPublicFeatureFlags = async (
	installationId: string,
	requestedUserId?: string,
): Promise<Record<string, boolean>> => {
	const enabledFeatureFlags: Record<string, boolean> = {};
	const activeFlags = Flags.list.filter((flag) => flag.status);
	const nonAdminUserCount = UsersList.list.filter(
		(user) => user.profile.role !== 'admin',
	).length;
	const congregationCount = CongregationsList.list.length;
	const installationCount = InstallationsList.list.length;
	let userId = requestedUserId;

	for (const flag of activeFlags) {
		if (installationId.length === 0) continue;

		if (flag.availability === 'app') {
			if (flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = flag.status;
				continue;
			}

			if (flag.coverage === 0) continue;

			const installationAlreadyIncluded = flag.installations.some(
				(installation) => installation.id === installationId,
			);

			if (installationAlreadyIncluded) {
				enabledFeatureFlags[flag.name] = flag.status;
			}

			if (!installationAlreadyIncluded) {
				const currentCoverage =
					(flag.installations.length * 100) / installationCount;

				if (currentCoverage < flag.coverage) {
					enabledFeatureFlags[flag.name] = flag.status;
					await registerFeatureFlagInstallation(flag, {
						id: installationId,
						registered: new Date().toISOString(),
					});
				}
			}

			continue;
		}

		const installation = InstallationsList.find(installationId);
		userId = userId || installation?.user;

		if (flag.availability === 'congregation' && userId) {
			const user = UsersList.findById(userId);
			const congregationId = user?.profile.congregation?.id;
			const congregation = congregationId
				? CongregationsList.findById(congregationId)
				: undefined;

			if (!congregation) continue;

			const congregationHasFlag = congregation.flags.includes(flag.id);

			if (congregationHasFlag) {
				enabledFeatureFlags[flag.name] = true;
			}

			if (!congregationHasFlag && flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = true;

				const assignedFlags = assignFeatureFlag(congregation.flags, flag.id);
				await saveCongregationFeatureFlags(congregation, assignedFlags);
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
					await saveCongregationFeatureFlags(congregation, assignedFlags);
				}
			}
		}

		if (flag.availability === 'user' && userId) {
			const user = UsersList.findById(userId);

			if (!user) continue;

			const userHasFlag = user.flags.includes(flag.id);

			if (userHasFlag) {
				enabledFeatureFlags[flag.name] = true;
			}

			if (!userHasFlag && flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = true;

				const assignedFlags = assignFeatureFlag(user.flags, flag.id);
				await saveUserFeatureFlags(user, assignedFlags);
			}

			if (!userHasFlag && flag.coverage > 0 && flag.coverage < 100) {
				const assignedUserCount = UsersList.list.filter((record) => {
					return record.flags.includes(flag.id);
				}).length;
				const currentCoverage = (assignedUserCount * 100) / nonAdminUserCount;

				if (currentCoverage < flag.coverage) {
					enabledFeatureFlags[flag.name] = flag.status;

					const assignedFlags = assignFeatureFlag(user.flags, flag.id);
					await saveUserFeatureFlags(user, assignedFlags);
				}
			}
		}
	}

	await registerInstallation(installationId, userId);

	return enabledFeatureFlags;
};
