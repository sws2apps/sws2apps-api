import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import {
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
	toggleFeatureFlagAssignment,
} from '../feature-flags/feature-flag-assignments.service.js';
import { Flags } from '../feature-flags/flags.js';
import { FeatureFlag } from '../feature-flags/feature-flag.js';

export type AdministrationFlagErrorCode =
	| 'USER_NOT_FOUND'
	| 'CONGREGATION_NOT_FOUND'
	| 'FLAG_NOT_FOUND';

export class AdministrationFlagError extends Error {
	constructor(public readonly code: AdministrationFlagErrorCode) {
		super(code);
		this.name = 'AdministrationFlagError';
	}
}

type AdministrationFlagSource = Pick<
	FeatureFlag,
	'availability' | 'coverage' | 'description' | 'id' | 'name' | 'status'
>;

type FlagUserSource = {
	id: string;
	flags: string[];
	profile: {
		firstname: { value: string };
		lastname: { value: string };
	};
};

type FlagCongregationSource = {
	id: string;
	flags: string[];
	settings: {
		country_code: string;
		cong_name: string;
	};
};

const formatUserName = (user: FlagUserSource): string => {
	const firstName = user.profile.firstname.value;
	const lastName = user.profile.lastname.value;

	return lastName ? `${lastName} ${firstName}` : firstName;
};

const formatCongregationName = (congregation: FlagCongregationSource): string => {
	return `(${congregation.settings.country_code}) ${congregation.settings.cong_name}`;
};

export const buildAdministrationFlagList = (
	flags: readonly AdministrationFlagSource[],
	users: readonly FlagUserSource[],
	congregations: readonly FlagCongregationSource[],
) => {
	return flags.map((flag) => {
		const assignedUsers = users.filter((user) => user.flags.includes(flag.id));
		const assignedCongregations = congregations.filter((congregation) =>
			congregation.flags.includes(flag.id),
		);

		return {
			availability: flag.availability,
			coverage: flag.coverage,
			description: flag.description,
			id: flag.id,
			name: flag.name,
			status: flag.status,
			users: assignedUsers.map((user) => ({
				name: formatUserName(user),
				id: user.id,
			})),
			congregations: assignedCongregations.map((congregation) => ({
				name: formatCongregationName(congregation),
				id: congregation.id,
			})),
		};
	});
};

export const getAdministrationFlags = () => {
	return buildAdministrationFlagList(Flags.list, UsersList.list, CongregationsList.list);
};

export const createAdministrationFlag = async (
	name: string,
	description: string,
	availability: FeatureFlag['availability'],
) => {
	await Flags.create(name, description, availability);
	return getAdministrationFlags();
};

export const deleteAdministrationFlag = async (flagId: string) => {
	await Flags.delete(flagId);
	return getAdministrationFlags();
};

export const updateAdministrationFlag = async (
	flagId: string,
	name: string,
	description: string,
	coverage: number,
) => {
	const flag = Flags.findById(flagId);

	if (!flag) return undefined;

	if (name !== flag.name || description !== flag.description || coverage !== flag.coverage) {
		await flag.update(name, description, coverage);
	}

	return getAdministrationFlags();
};

export const toggleAdministrationFlag = async (flagId: string) => {
	const flag = Flags.findById(flagId);

	if (!flag) return undefined;

	await flag.toggle();
	return getAdministrationFlags();
};

export const toggleUserFlag = async (userId: string, flagId: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new AdministrationFlagError('USER_NOT_FOUND');

	const flag = Flags.findById(flagId);
	if (!flag) throw new AdministrationFlagError('FLAG_NOT_FOUND');

	const userFlags = toggleFeatureFlagAssignment(user.flags, flagId);
	await saveUserFeatureFlags(user, userFlags);
	return getAdministrationFlags();
};

export const toggleCongregationFlag = async (congregationId: string, flagId: string) => {
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) {
		throw new AdministrationFlagError('CONGREGATION_NOT_FOUND');
	}

	const flag = Flags.findById(flagId);
	if (!flag) throw new AdministrationFlagError('FLAG_NOT_FOUND');

	const congregationFlags = toggleFeatureFlagAssignment(
		congregation.flags,
		flagId,
	);
	await saveCongregationFeatureFlags(congregation, congregationFlags);
	return getAdministrationFlags();
};
