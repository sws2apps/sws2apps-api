import type { Response } from 'express';
import { LogLevel } from '@logtail/types';

type ResponseLogLevel = 'info' | 'warn';

const setResponseLog = (response: Response, type: ResponseLogLevel, message: string) => {
	response.locals.type = type === 'info' ? LogLevel.Info : LogLevel.Warn;
	response.locals.message = message;
};

/** Records internal success metadata without changing the HTTP response. */
export const setSuccessResponseLog = (response: Response, message: string) => {
	setResponseLog(response, 'info', message);
};

export const sendSuccess = <Body>(
	response: Response,
	body: Body,
	logMessage: string,
	statusCode = 200,
) => {
	setSuccessResponseLog(response, logMessage);
	return response.status(statusCode).json(body);
};

/**
 * Sends a client-safe error while retaining a separate internal log message.
 * Never pass exception details or sensitive request values as `publicMessage`.
 */
export const sendClientError = (
	response: Response,
	statusCode: number,
	publicMessage: string,
	logMessage: string,
	logType: ResponseLogLevel = 'warn',
) => {
	setResponseLog(response, logType, logMessage);
	return response.status(statusCode).json({ message: publicMessage });
};

/**
 * Sends a stable server error without exposing the internal failure context
 * recorded for request logging.
 */
export const sendServerError = (
	response: Response,
	publicMessage: string,
	logMessage: string,
) => {
	setResponseLog(response, 'warn', logMessage);
	return response.status(500).json({ message: publicMessage });
};

export const sendEmptySuccess = (response: Response, logMessage: string, statusCode = 204) => {
	setResponseLog(response, 'info', logMessage);
	return response.status(statusCode).end();
};
