import { Country } from '../../definition/app.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { Congregation } from '../../classes/Congregation.js';
import { UsersList } from '../../classes/Users.js';
import { backupUploadsInProgress } from '../../../index.js';

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

export const adminCongregationGet = (id: string) => {
	const cong = CongregationsList.findById(id)!;

	const cong_members = cong.getMembers('undefined');

	const cong_persons = cong_members.map((person) => {
		const user = UsersList.findById(person.id);

		return {
			id: person.id,
			sessions: person.sessions,
			profile: {
				...person.profile,
				email: user?.email,
				mfa_enabled: user?.profile.mfa_enabled,
				congregation: { id: cong.id, cong_role: person.profile.cong_role || [] },
			},
		};
	});

	const congAcessList = cong.outgoing_speakers.access;

	const cong_requests = congAcessList
		.map((access) => {
			const foundCong = CongregationsList.findById(access.cong_id)!;

			return {
				cong_id: access.cong_id,
				request_id: access.request_id,
				cong_country: foundCong.settings.country_code,
				cong_number: foundCong.settings.cong_number,
				cong_name: foundCong.settings.cong_name,
				request_status: access.status,
			};
		})
		.sort((a, b) => {
			if (a.cong_country === b.cong_country) {
				return a.cong_name.localeCompare(b.cong_name);
			}

			return a.cong_country.localeCompare(b.cong_country);
		});

	const has_speakers_key = cong.outgoing_speakers.speakers_key ? cong.outgoing_speakers.speakers_key.length > 0 : false;

	return { cong_persons, cong_requests, has_speakers_key };
};

export const findBackupByCongregation = (congregationId: string) => {
	for (const [uploadId, record] of backupUploadsInProgress.entries()) {
		if (record.congregationId === congregationId) {
			return { uploadId, record };
		}
	}

	return undefined;
};
