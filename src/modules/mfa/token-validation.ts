export const isTokenWithinAllowedWindow = (timeStepDifference: number | null) => {
	if (timeStepDifference === null) return false;
	return timeStepDifference >= -1 && timeStepDifference <= 1;
};
