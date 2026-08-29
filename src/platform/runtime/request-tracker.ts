export type RequestTrackerType = {
	ip: string;
	city: string;
	reqInProgress: boolean;
	failedLoginAttempt: number;
	retryOn: number | undefined;
};
