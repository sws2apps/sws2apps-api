import { compareAndModifyFile, getFileFromStorage } from '#platform/firebase/storage.js';
import type { PartnerState } from './partner.types.js';

const location = (congregationId: string) => ({ type: 'congregation' as const, path: `${congregationId}/preaching_partner/main.txt` });
const parseState = (text?: string): PartnerState => text ? JSON.parse(text) as PartnerState : { requests: [], receipts: [] };

export const partnerRepository = {
	read: async (congregationId: string) => parseState(await getFileFromStorage(location(congregationId))),
	mutate: <T>(congregationId: string, update: (state: PartnerState) => { state: PartnerState; result: T }) =>
		compareAndModifyFile(location(congregationId), (text) => {
			const { state, result } = update(parseState(text));
			return { data: JSON.stringify(state), result };
		}),
};
