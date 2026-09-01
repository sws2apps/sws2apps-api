export const requirePositiveBatchSize = (batchSize: number): void => {
	if (!Number.isInteger(batchSize) || batchSize <= 0) {
		throw new RangeError('Batch size must be a positive integer');
	}
};
