import type { Country } from '../../domain/countries/country.js';
import { getCountries } from '../../platform/countries/country-client.js';
import { getApplicationLanguageCount } from '../../platform/localization/crowdin-client.js';
import type { CongregationByCountry } from '../congregations/congregations.types.js';
import { CongregationsList } from '../congregations/congregations.js';
import { Flags } from '../feature-flags/flags.js';
import { InstallationsList } from '../installations/installation-list.js';
import { UsersList } from '../users/users.js';

type CongregationSummary = {
	settings: {
		country_code: string;
	};
};

type UserSummary = {
	profile: {
		role: string;
	};
};

type BuildPublicStatsInput = {
	countries: Country[];
	congregations: CongregationSummary[];
	users: UserSummary[];
	languages: number;
};

export const buildPublicStats = ({ countries, congregations, users, languages }: BuildPublicStatsInput) => {
	const nonAdminUsers = users.filter((user) => user.profile.role !== 'admin');

	const congregationsByCountry = congregations.reduce((countriesWithCongregations: CongregationByCountry[], congregation) => {
		const existingCountry = countriesWithCongregations.find(
			(country) => country.country_code === congregation.settings.country_code,
		);

		if (existingCountry) {
			existingCountry.congregations++;
			return countriesWithCongregations;
		}

		const countryDetails = countries.find(
			(country) => country.countryCode === congregation.settings.country_code,
		);

		countriesWithCongregations.push({
			country_name: countryDetails?.countryName || 'Unknown',
			country_code: congregation.settings.country_code,
			congregations: 1,
		});

		return countriesWithCongregations;
	}, []);

	return {
		languages,
		congregations: congregations.length,
		users: nonAdminUsers.length,
		countries: {
			count: congregationsByCountry.length,
			list: congregationsByCountry,
		},
	};
};

export const getPublicStats = async () => {
	const countries = await getCountries('E');
	const languages = await getApplicationLanguageCount();

	return buildPublicStats({
		countries,
		congregations: CongregationsList.list,
		users: UsersList.list,
		languages,
	});
};

export const getPublicFeatureFlags = async (
	installationId: string,
	requestedUserId?: string,
): Promise<Record<string, boolean>> => {
	const enabledFeatureFlags: Record<string, boolean> = {};
	const activeFlags = Flags.list.filter((flag) => flag.status);
	const nonAdminUserCount = UsersList.list.filter((user) => user.profile.role !== 'admin').length;
	const congregationCount = CongregationsList.list.length;
	const installationCount = InstallationsList.list.length;
	let userId = requestedUserId;

	for (const flag of activeFlags) {
		if (installationId.length === 0) {
			continue;
		}

		if (flag.availability === 'app') {
			if (flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = flag.status;
				continue;
			}

			if (flag.coverage === 0) {
				continue;
			}

			const installationAlreadyIncluded = flag.installations.some(
				(installation) => installation.id === installationId,
			);

			if (installationAlreadyIncluded) {
				enabledFeatureFlags[flag.name] = flag.status;
			}

			if (!installationAlreadyIncluded) {
				const currentCoverage = (flag.installations.length * 100) / installationCount;

				if (currentCoverage < flag.coverage) {
					enabledFeatureFlags[flag.name] = flag.status;
					flag.installations.push({
						id: installationId,
						registered: new Date().toISOString(),
					});

					await Flags.save();
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

			if (!congregation) {
				continue;
			}

			const congregationHasFlag = congregation.flags.includes(flag.id);

			if (congregationHasFlag) {
				enabledFeatureFlags[flag.name] = true;
			}

			if (!congregationHasFlag && flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = true;

				const assignedFlags = structuredClone(congregation.flags);
				assignedFlags.push(flag.id);
				await congregation.saveFlags(assignedFlags);
			}

			if (!congregationHasFlag && flag.coverage > 0 && flag.coverage < 100) {
				const assignedCongregationCount = CongregationsList.list.filter((record) =>
					record.flags.includes(flag.id),
				).length;
				const currentCoverage = (assignedCongregationCount * 100) / congregationCount;

				if (currentCoverage < flag.coverage) {
					enabledFeatureFlags[flag.name] = flag.status;

					const assignedFlags = structuredClone(congregation.flags);
					assignedFlags.push(flag.id);
					await congregation.saveFlags(assignedFlags);
				}
			}
		}

		if (flag.availability === 'user' && userId) {
			const user = UsersList.findById(userId);

			if (!user) {
				continue;
			}

			const userHasFlag = user.flags.includes(flag.id);

			if (userHasFlag) {
				enabledFeatureFlags[flag.name] = true;
			}

			if (!userHasFlag && flag.coverage === 100) {
				enabledFeatureFlags[flag.name] = true;

				const assignedFlags = structuredClone(user.flags);
				assignedFlags.push(flag.id);
				await user.updateFlags(assignedFlags);
			}

			if (!userHasFlag && flag.coverage > 0 && flag.coverage < 100) {
				const assignedUserCount = UsersList.list.filter((record) =>
					record.flags.includes(flag.id),
				).length;
				const currentCoverage = (assignedUserCount * 100) / nonAdminUserCount;

				if (currentCoverage < flag.coverage) {
					enabledFeatureFlags[flag.name] = flag.status;

					const assignedFlags = structuredClone(user.flags);
					assignedFlags.push(flag.id);
					await user.updateFlags(assignedFlags);
				}
			}
		}
	}

	const installation = InstallationsList.find(installationId);
	const registration = { id: installationId, registered: new Date().toISOString() };

	if (!installation && userId) {
		InstallationsList.linked.push({ user: userId, installations: [registration] });
		await InstallationsList.save();
	}

	if (!installation && !userId) {
		InstallationsList.pending.push(registration);
		await InstallationsList.save();
	}

	if (installation?.status === 'pending' && userId) {
		InstallationsList.pending = InstallationsList.pending.filter(
			(record) => record.id !== installationId,
		);
		InstallationsList.linked.push({ user: userId, installations: [registration] });
		await InstallationsList.save();
	}

	return enabledFeatureFlags;
};
