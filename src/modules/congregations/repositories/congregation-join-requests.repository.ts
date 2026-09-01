import {
	getFileFromStorage,
	uploadFileToStorage,
} from '#platform/firebase/storage.js';
import type { UserRequestAccess } from '../types/congregations.types.js';

export const getCongregationJoinRequests = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/users/requests.txt` });

	if (data) {
		const requests = JSON.parse(data) as UserRequestAccess[];
		return requests;
	}

	return [];
};

export const setCongregationJoinRequests = async (id: string, requests: UserRequestAccess[]) => {
	const data = JSON.stringify(requests);
	const path = `${id}/users/requests.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};
