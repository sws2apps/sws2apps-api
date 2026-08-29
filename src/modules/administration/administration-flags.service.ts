import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import { Flags } from '../../v3/classes/Flags.js';
import { FeatureFlag } from '../feature-flags/feature-flag.js';

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
