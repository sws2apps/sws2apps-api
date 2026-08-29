type DataRecord = Record<string, unknown>;

/**
 * Applies incoming backup values to an existing record.
 *
 * Nested records with an `updatedAt` value only replace the local record when
 * the incoming value is newer. Other nested records are merged recursively.
 * The local record is intentionally mutated so callers can keep its identity.
 */
export const mergeIncomingData = <T extends object>(
	localData: T,
	incomingData: T,
): T => {
	const localRecord = localData as DataRecord;
	const incomingRecord = incomingData as DataRecord;

	const objectKeys = Object.keys(incomingRecord).filter((key) => {
		const incomingValue = incomingRecord[key];

		return incomingValue !== null && typeof incomingValue === 'object';
	});

	for (const key of objectKeys) {
		const localValue = localRecord[key];
		const incomingValue = incomingRecord[key] as DataRecord;

		if (localValue && typeof localValue === 'object') {
			if (!('updatedAt' in incomingValue)) {
				mergeIncomingData(localValue, incomingValue);
			} else {
				const localUpdatedAt = (localValue as DataRecord).updatedAt;
				const incomingUpdatedAt = incomingValue.updatedAt;

				if (incomingUpdatedAt! > localUpdatedAt!) {
					localRecord[key] = incomingValue;
				}
			}
		} else {
			localRecord[key] = incomingValue;
		}
	}

	const primitiveKeys = Object.keys(incomingRecord).filter(
		(key) => typeof incomingRecord[key] !== 'object',
	);

	for (const key of primitiveKeys) {
		localRecord[key] = incomingRecord[key];
	}

	return localData;
};
