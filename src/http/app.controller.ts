import { NextFunction, Request, Response } from 'express';
import { sendClientError, sendServerError, sendSuccess } from '#http/responses.js';
import { applicationVersion } from '#config/application.js';

type ApiError = Error & {
	errorInfo?: {
		code?: string;
	};
};

export const getRoot = async (_request: Request, response: Response) => {
	sendSuccess(response, { message: `SWS Apps API services v${applicationVersion}` }, 'success opening main route');
};

export const invalidEndpointHandler = async (_request: Request, response: Response) => {
	sendClientError(response, 404, 'error_api_invalid-endpoint', 'invalid endpoint');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
	const apiError = error as ApiError;

	if (apiError.errorInfo?.code) {
		const publicErrorCode = apiError.errorInfo.code.replace('/', '_');

		sendServerError(response, `error_${publicErrorCode}`, 'request failed with an internal error');
		return;
	}

	sendServerError(response, 'error_api_internal-error', 'request failed with an internal error');
};
