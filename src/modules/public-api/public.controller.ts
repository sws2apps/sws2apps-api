import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fetch from 'node-fetch';

import { env } from '../../config/env.js';
import { formatError } from '../../http/validation-errors.js';
import type { Country } from '../../domain/countries/country.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import { Flags } from '../../v3/classes/Flags.js';
import { InstallationsList } from '../installations/installation-list.js';
import { getApplicationLanguageCount } from '../../platform/localization/crowdin-client.js';
import { buildPublicStats } from './public.service.js';

export const getStats = async (req: Request, res: Response) => {
	const countryApiUrl = env.appCountryApi + new URLSearchParams({ language: 'E' });

	const countryApiResponse = await fetch(countryApiUrl);

	if (!countryApiResponse.ok) {
		throw new Error('FETCH_FAILED');
	}

	const countries = (await countryApiResponse.json()) as Country[];
	const congregations = CongregationsList.list;
	const users = UsersList.list;
	const languages = await getApplicationLanguageCount();
	const publicStats = buildPublicStats({ countries, congregations, users, languages });

	res.locals.type = 'info';
	res.locals.message = 'app stats generated';
	res.status(200).json(publicStats);
};

export const getFeatureFlags = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const installation = req.headers.installation as string;
	let userId = req.headers.user as string | undefined;

	const usersCount = UsersList.list.filter((record) => record.profile.role !== 'admin').length;
	const congregationsCount = CongregationsList.list.length;
	const installationsCount = InstallationsList.list.length;

	const result: Record<string, boolean> = {};

	// get enabled flags
	const enabledFlags = Flags.list.filter((record) => record.status);

	for (const flag of enabledFlags) {
		// don’t provide flag if installation is not provided
		if (installation.length === 0) continue;

		// target app flag
		if (flag.availability === 'app') {
			// if the coverage is 100, then the flag is always enabled
			if (flag.coverage === 100) {
				result[flag.name] = flag.status;
				continue;
			}

			if (flag.coverage === 0) {
				continue;
			}

			const findInstallation = flag.installations.find((rec) => rec.id === installation);

			// if installation is included in the flag installations, then the flag is enabled
			if (findInstallation) {
				result[flag.name] = flag.status;
			}

			// if the installation is not included in the flag installations, then check the coverage
			if (!findInstallation) {
				const currentCount = flag.installations.length;
				const currentAvg = (currentCount * 100) / installationsCount;

				if (currentAvg < flag.coverage) {
					result[flag.name] = flag.status;

					const foundFlag = Flags.list.find((record) => record.id === flag.id)!;
					foundFlag.installations.push({ id: installation, registered: new Date().toISOString() });

					await Flags.save();

					continue;
				}
			}

			continue;
		}

		// get user associated with the installation
		const findInstallation = InstallationsList.find(installation);
		userId = userId || findInstallation?.user;

		// target congregation flag
		if (flag.availability === 'congregation' && userId) {
			const user = UsersList.findById(userId);
			const congId = user?.profile.congregation?.id;
			const cong = congId ? CongregationsList.findById(congId) : undefined;

			// if the user is not associated with a congregation, skip the flag
			if (!cong) continue;

			const ownFlag = cong.flags.find((record) => record === flag.id);

			// if the congregation already has the flag, set it to true
			if (ownFlag) {
				result[flag.name] = true;
			}

			// if the congregation does not have the flag, check the coverage
			if (!ownFlag) {
				if (flag.coverage === 100) {
					result[flag.name] = true;

					const flags = structuredClone(cong.flags);
					flags.push(flag.id);

					await cong.saveFlags(flags);
				}

				if (flag.coverage > 0 && flag.coverage < 100) {
					const currentCount = CongregationsList.list.filter((record) => record.flags.some((f) => f === flag.id)).length;
					const currentAvg = (currentCount * 100) / congregationsCount;

					if (currentAvg < flag.coverage) {
						result[flag.name] = flag.status;

						const flags = structuredClone(cong.flags);
						flags.push(flag.id);

						await cong.saveFlags(flags);
					}
				}
			}
		}

		// target user flag
		if (flag.availability === 'user' && userId) {
			const user = UsersList.findById(userId);

			// if the user is not found, skip the flag
			if (!user) continue;

			const ownFlag = user.flags.find((record) => record === flag.id);

			// if the user already has the flag, set it to true
			if (ownFlag) {
				result[flag.name] = true;
			}

			// if the user does not have the flag, check the coverage
			if (!ownFlag) {
				if (flag.coverage === 100) {
					result[flag.name] = true;

					const flags = structuredClone(user.flags);
					flags.push(flag.id);

					await user.updateFlags(flags);
				}

				if (flag.coverage > 0 && flag.coverage < 100) {
					const currentCount = UsersList.list.filter((record) => record.flags.some((f) => f === flag.id)).length;
					const currentAvg = (currentCount * 100) / usersCount;

					if (currentAvg < flag.coverage) {
						result[flag.name] = flag.status;

						const flags = structuredClone(user.flags);
						flags.push(flag.id);

						await user.updateFlags(flags);
					}
				}
			}
		}
	}

	// update installation
	const findInstallation = InstallationsList.find(installation);

	// if the installation is not found and userId is provided, link the installation to the user
	if (!findInstallation && userId) {
		InstallationsList.linked.push({ user: userId, installations: [{ id: installation, registered: new Date().toISOString() }] });
		await InstallationsList.save();
	}

	// if the installation is not found and userId is not provided, add it to pending installations
	if (!findInstallation && !userId) {
		InstallationsList.pending.push({ id: installation, registered: new Date().toISOString() });
		await InstallationsList.save();
	}

	// if the installation is found and its status is pending and userId is provided, link the installation to the user
	if (findInstallation?.status === 'pending' && userId) {
		InstallationsList.pending = InstallationsList.pending.filter((record) => record.id !== installation);
		InstallationsList.linked.push({ user: userId, installations: [{ id: installation, registered: new Date().toISOString() }] });
		await InstallationsList.save();
	}

	res.locals.type = 'info';
	res.locals.message = 'app client fetched feature flags';
	res.status(200).json(result);
};
