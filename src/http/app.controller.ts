import { NextFunction, Request, Response } from 'express';
import { sendClientError, sendServerError, sendSuccess } from '#http/responses.js';
import { applicationVersion } from '#config/application.js';

const firebaseErrorCodePattern = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;

const getFirebaseErrorCode = (error: unknown) => {
	if (typeof error !== 'object' || error === null || !('errorInfo' in error)) {
		return undefined;
	}

	const errorInfo = error.errorInfo;
	if (typeof errorInfo !== 'object' || errorInfo === null || !('code' in errorInfo)) {
		return undefined;
	}

	const errorCode = errorInfo.code;
	if (typeof errorCode !== 'string' || !firebaseErrorCodePattern.test(errorCode)) {
		return undefined;
	}

	return errorCode;
};

export const getRoot = async (_request: Request, response: Response) => {
	sendSuccess(response, { message: `SWS Apps API services v${applicationVersion}` }, 'success opening main route');
};

export const invalidEndpointHandler = async (_request: Request, response: Response) => {
	sendClientError(response, 404, 'error_api_invalid-endpoint', 'invalid endpoint');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
	const firebaseErrorCode = getFirebaseErrorCode(error);

	if (firebaseErrorCode) {
		const publicErrorCode = firebaseErrorCode.replace('/', '_');

		sendServerError(response, `error_${publicErrorCode}`, 'request failed with an internal error');
		return;
	}

	sendServerError(response, 'error_api_internal-error', 'request failed with an internal error');
};
