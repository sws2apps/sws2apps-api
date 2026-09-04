export const subtractUtcMonths = (currentTime: Date, months: number): Date => {
	if (Number.isNaN(currentTime.getTime())) {
		throw new RangeError('Current time must be a valid date');
	}

	if (!Number.isSafeInteger(months) || months < 0) {
		throw new RangeError('Months must be a non-negative integer');
	}

	const cutoff = new Date(currentTime);
	const originalDay = cutoff.getUTCDate();

	cutoff.setUTCDate(1);
	cutoff.setUTCMonth(cutoff.getUTCMonth() - months);

	const lastDayOfTargetMonth = new Date(
		Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
	).getUTCDate();
	cutoff.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

	return cutoff;
};

export const isTimestampOnOrAfter = (
	timestamp: string,
	cutoff: Date,
): boolean => {
	const timestampMilliseconds = Date.parse(timestamp);

	return (
		Number.isFinite(timestampMilliseconds) &&
		timestampMilliseconds >= cutoff.getTime()
	);
};
