import type { OutgoingSpeakersRecordType } from './congregations.types.js';
import { setCongOutgoingSpeakers } from './congregations.repository.js';

export const saveOutgoingSpeakersState = async (
	congregationId: string,
	outgoingSpeakers: Pick<OutgoingSpeakersRecordType, 'list' | 'access'>,
): Promise<void> => {
	const storageData = JSON.stringify({
		list: outgoingSpeakers.list,
		access: outgoingSpeakers.access,
	});

	await setCongOutgoingSpeakers(congregationId, storageData);
};
