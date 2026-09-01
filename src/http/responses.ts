import type { Response } from 'express';

const setResponseLog = (response: Response, type: 'info' | 'warn', message: string) => {
	response.locals.type = type;
	response.locals.message = message;
};

export const sendSuccess = <Body>(
	response: Response,
	body: Body,
	logMessage: string,
	statusCode = 200,
) => {
	setResponseLog(response, 'info', logMessage);
	return response.status(statusCode).json(body);
};

export const sendClientError = (
	response: Response,
	statusCode: number,
	publicMessage: string,
	logMessage: string,
	logType: 'info' | 'warn' = 'warn',
) => {
	setResponseLog(response, logType, logMessage);
	return response.status(statusCode).json({ message: publicMessage });
};

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
