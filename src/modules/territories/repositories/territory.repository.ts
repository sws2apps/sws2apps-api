import {
	readVersionedStorage,
	writeVersionedStorage,
} from '#platform/firebase/versioned-storage.js';
import type { TerritoryState } from '../territory.types.js';
import { TerritoryError } from '../territory.types.js';
import { isTerritoryId } from '../territory-validation.js';

const storageOptions = (congregationId: string) => {
	if (!isTerritoryId(congregationId)) throw new TerritoryError('INPUT_INVALID');
	return { type: 'congregation' as const, path: `${congregationId}/territories/main.txt` };
};

export const readTerritories = async (congregationId: string) => {
	const stored = await readVersionedStorage(storageOptions(congregationId));
	const state: TerritoryState = stored.data
		? JSON.parse(stored.data)
		: {
				schemaVersion: 1,
				revision: 0,
				policy: { revision: 0, grants: [], content: '' },
				records: [],
			};
	if (state.schemaVersion !== 1) throw new Error('Unsupported territory storage version');
	return { state, generation: stored.generation };
};

export const writeTerritories = async (
	congregationId: string,
	generation: string,
	state: TerritoryState,
): Promise<void> => {
	const data = JSON.stringify(state);
	if (state.records.length > 10000 || Buffer.byteLength(data) > 16 * 1024 * 1024) {
		throw new TerritoryError('TERRITORY_LIMIT_EXCEEDED');
	}
	const saved = await writeVersionedStorage(storageOptions(congregationId), generation, data);
	if (!saved) throw new TerritoryError('TERRITORY_CONFLICT');
};
