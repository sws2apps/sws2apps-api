import { CongregationsList } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import {
	saveCongregationFeatureFlags,
	saveUserFeatureFlags,
	toggleFeatureFlagAssignment,
	createFeatureFlag,
	deleteFeatureFlag,
	toggleFeatureFlag,
	updateFeatureFlag,
	Flags,
	FeatureFlag,
} from '#modules/feature-flags/index.js';




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

type AdministrationFlagDependencies = {
	createFlag: typeof createFeatureFlag;
	deleteFlag: typeof deleteFeatureFlag;
	updateFlag: typeof updateFeatureFlag;
	toggleFlag: typeof toggleFeatureFlag;
	saveUserFlags: typeof saveUserFeatureFlags;
	saveCongregationFlags: typeof saveCongregationFeatureFlags;
};

const defaultFlagDependencies: AdministrationFlagDependencies = {
	createFlag: createFeatureFlag,
	deleteFlag: deleteFeatureFlag,
	updateFlag: updateFeatureFlag,
	toggleFlag: toggleFeatureFlag,
	saveUserFlags: saveUserFeatureFlags,
	saveCongregationFlags: saveCongregationFeatureFlags,
};

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
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
	const { createFlag } = { ...defaultFlagDependencies, ...dependencies };
	await createFlag(name, description, availability);
	return getAdministrationFlags();
};

export const deleteAdministrationFlag = async (
	flagId: string,
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
	const { deleteFlag } = { ...defaultFlagDependencies, ...dependencies };
	await deleteFlag(flagId);
	return getAdministrationFlags();
};

export const updateAdministrationFlag = async (
	flagId: string,
	name: string,
	description: string,
	coverage: number,
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
	const flag = Flags.findById(flagId);

	if (!flag) return undefined;

	if (name !== flag.name || description !== flag.description || coverage !== flag.coverage) {
		const { updateFlag } = { ...defaultFlagDependencies, ...dependencies };
		await updateFlag(flag, name, description, coverage);
	}

	return getAdministrationFlags();
};

export const toggleAdministrationFlag = async (
	flagId: string,
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
	const flag = Flags.findById(flagId);

	if (!flag) return undefined;

	const { toggleFlag } = { ...defaultFlagDependencies, ...dependencies };
	await toggleFlag(flag);
	return getAdministrationFlags();
};

export const toggleUserFlag = async (
	userId: string,
	flagId: string,
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
	const user = UsersList.findById(userId);
	if (!user) throw new AdministrationFlagError('USER_NOT_FOUND');

	const flag = Flags.findById(flagId);
	if (!flag) throw new AdministrationFlagError('FLAG_NOT_FOUND');

	const userFlags = toggleFeatureFlagAssignment(user.flags, flagId);
	const { saveUserFlags } = { ...defaultFlagDependencies, ...dependencies };
	await saveUserFlags(user, userFlags);
	return getAdministrationFlags();
};

export const toggleCongregationFlag = async (
	congregationId: string,
	flagId: string,
	dependencies: Partial<AdministrationFlagDependencies> = {},
) => {
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
	const { saveCongregationFlags } = { ...defaultFlagDependencies, ...dependencies };
	await saveCongregationFlags(congregation, congregationFlags);
	return getAdministrationFlags();
};
