export type RequestTrackerType = {
	ip: string;
	city: string;
	reqInProgress: boolean;
	failedLoginAttempt: number;
	retryOn: number | undefined;
};

export const hasReachedFailedRequestLimit = (failedAttempts: number): boolean => {
	return failedAttempts >= 3;
};

export const findRequestTrackerEntry = (
	requestTracker: RequestTrackerType[],
	clientIp: string,
): RequestTrackerType | undefined => {
	return requestTracker.find((client) => client.ip === clientIp);
};

export const setRequestTrackerEntry = (
	requestTracker: RequestTrackerType[],
	entry: RequestTrackerType,
): void => {
	const existingIndex = requestTracker.findIndex((client) => client.ip === entry.ip);

	if (existingIndex >= 0) {
		requestTracker[existingIndex] = entry;
		return;
	}

	requestTracker.push(entry);
};

export const removeRequestTrackerEntry = (
	requestTracker: RequestTrackerType[],
	clientIp: string,
): boolean => {
	const existingIndex = requestTracker.findIndex((client) => client.ip === clientIp);
	if (existingIndex < 0) return false;

	requestTracker.splice(existingIndex, 1);
	return true;
};
