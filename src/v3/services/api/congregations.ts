import { Country } from '../../definition/app.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { Congregation } from '../../classes/Congregation.js';
import { UsersList } from '../../classes/Users.js';

export const adminCongregationsGet = async () => {
	try {
		const url = process.env.APP_COUNTRY_API! + new URLSearchParams({ language: 'E' });

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error('FETCH_FAILED');
		}

		const countriesList: Country[] = await response.json();

		const congsList = CongregationsList.list;

		const result = [];

		for await (const cong of congsList) {
			const country = countriesList.find((record) => record.countryCode === cong.settings.country_code);

			const obj = {
				id: cong.id,
				country_code: cong.settings.country_code,
				country_name: country?.countryName || 'Unknown',
				cong_name: cong.settings.cong_name,
				cong_number: cong.settings.cong_number,
				createdAt: cong.createdAt,
				data_sync: cong.settings.data_sync.value,
				metadata: cong.metadata,
			};

			result.push(obj);
		}

		return result;
	} catch (error) {
		throw new Error((error as Error).message);
	}
};

export const congregationJoinRequestsGet = (cong: Congregation) => {
	const result = cong.join_requests.map((request) => {
		const user = UsersList.findById(request.user);

		return {
			...request,
			firstname: user?.profile.firstname.value || '_Deleted',
			lastname: user?.profile.lastname.value || '_Deleted',
		};
	});

	return result;
};
