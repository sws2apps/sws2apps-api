import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import fetch from 'node-fetch';

import { formatError } from '../utils/format_log.js';
import { Country } from '../definition/app.js';
import { CongregationByCountry } from '../definition/congregation.js';
import { CongregationsList } from '../classes/Congregations.js';
import { UsersList } from '../classes/Users.js';
import { Flags } from '../classes/Flags.js';
import { Installation } from '../classes/Installation.js';
import { getAppLanguages } from '../services/crowdin/index.js';

export const getStats = async (req: Request, res: Response) => {
	const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language: 'E' });

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('FETCH_FAILED');
	}

	const countries = (await response.json()) as Country[];

	const congs = CongregationsList.list;
	const users = UsersList.list.filter((record) => record.profile.role !== 'admin');

	const congsByCountry = congs.reduce((acc: CongregationByCountry[], current) => {
		const country = acc.find((record) => record.country_code === current.settings.country_code);

		if (!country) {
			const details = countries.find((record) => record.countryCode === current.settings.country_code);

			acc.push({
				country_name: details?.countryName || 'Unknown',
				country_code: current.settings.country_code,
				congregations: 1,
			});
		}

		if (country) {
			country.congregations++;
		}

		return acc;
	}, []);

	const languages = await getAppLanguages();

	const result = {
		languages,
		congregations: congs.length,
		users: users.length,
		countries: {
			count: congsByCountry.length,
			list: congsByCountry,
		},
	};

	res.locals.type = 'info';
	res.locals.message = 'app stats generated';
	res.status(200).json(result);
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
	const installationsCount = Installation.list.length;

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
		const findInstallation = Installation.find(installation);
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
	const findInstallation = Installation.find(installation);

	// if the installation is not found and userId is provided, link the installation to the user
	if (!findInstallation && userId) {
		Installation.linked.push({ user: userId, installations: [{ id: installation, registered: new Date().toISOString() }] });
		await Installation.save();
	}

	// if the installation is not found and userId is not provided, add it to pending installations
	if (!findInstallation && !userId) {
		Installation.pending.push({ id: installation, registered: new Date().toISOString() });
		await Installation.save();
	}

	// if the installation is found and its status is pending and userId is provided, link the installation to the user
	if (findInstallation?.status === 'pending' && userId) {
		Installation.pending = Installation.pending.filter((record) => record.id !== installation);
		Installation.linked.push({ user: userId, installations: [{ id: installation, registered: new Date().toISOString() }] });
		await Installation.save();
	}

	res.locals.type = 'info';
	res.locals.message = 'app client fetched feature flags';
	res.status(200).json(result);
};
