import { CongregationsList } from '../../classes/Congregations.js';
import { Flags } from '../../classes/Flags.js';
import { UsersList } from '../../classes/Users.js';

export const adminFlagsGet = () => {
	try {
		const flags = Flags.list;
		const users = UsersList.list;
		const congregations = CongregationsList.list;

		const result = flags.map((flag) => {
			const flagUsers = users.filter((user) => user.flags.some((f) => f === flag.id));
			const flagCongregations = congregations.filter((congregation) => congregation.flags.some((f) => f === flag.id));

			return {
				availability: flag.availability,
				coverage: flag.coverage,
				description: flag.description,
				id: flag.id,
				name: flag.name,
				status: flag.status,
				users: flagUsers.map((user) => {
					let name = user.profile.lastname.value;
					name += name.length > 0 ? ' ' : '';
					name += user.profile.firstname.value;

					return { name, id: user.id };
				}),
				congregations: flagCongregations.map((cong) => {
					let name = `(${cong.settings.country_code}) `;
					name += cong.settings.cong_name;

					return { name, id: cong.id };
				}),
			};
		});

		return result;
	} catch (error) {
		throw new Error((error as Error).message);
	}
};
