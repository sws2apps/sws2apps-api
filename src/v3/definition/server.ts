export type RequestTrackerType = {
	ip: string;
	city: string;
	reqInProgress: boolean;
	failedLoginAttempt: number;
	retryOn: number | undefined;
};

export type ServerTempVariableType = {
	MINIMUM_APP_VERSION: string;
	IS_SERVER_READY: boolean;
	REQUEST_TRACKER: RequestTrackerType[];
};
