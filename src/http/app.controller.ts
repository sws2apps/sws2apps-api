import { NextFunction, Request, Response } from 'express';
import { applicationVersion } from '../config/application.js';

type ApiError = Error & {
	errorInfo?: {
		code?: string;
	};
};

export const getRoot = async (_request: Request, response: Response) => {
	response.locals.type = 'info';
	response.locals.message = 'success opening main route';
	response.status(200).json({ message: `SWS Apps API services v${applicationVersion}` });
};

export const invalidEndpointHandler = async (_request: Request, response: Response) => {
	response.locals.type = 'warn';
	response.locals.message = 'invalid endpoint';
	response.status(404).json({ message: 'error_api_invalid-endpoint' });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
	const apiError = error as ApiError;

	response.locals.type = 'warn';
	response.locals.message = 'request failed with an internal error';

	if (apiError.errorInfo?.code) {
		const publicErrorCode = apiError.errorInfo.code.replace('/', '_');

		response.status(500).json({ message: `error_${publicErrorCode}` });
		return;
	}

	response.status(500).json({ message: 'error_api_internal-error' });
};
