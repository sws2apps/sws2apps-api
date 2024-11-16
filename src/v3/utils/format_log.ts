import requestIp from 'request-ip';
import { Request, Response } from 'express';
import { FieldValidationError, Result, ValidationError } from 'express-validator';

type LogMessageType = {
	method: string;
	status: number;
	path: string;
	origin: string;
	ip?: string;
	details: string;
};

export const formatLog = (message: string, req: Request, res: Response) => {
	const log = {} as LogMessageType;

	if (req && res) {
		const clientIp = requestIp.getClientIp(req);
		log.method = req.method;
		log.status = res.statusCode;
		log.path = req.originalUrl;
		log.origin = req.headers.origin || req.hostname;
		if (clientIp) log.ip = clientIp;
	}

	log.details = message.replace(/\n|\r/g, '');

	return JSON.stringify(log);
};

export const formatError = (errors: Result<ValidationError>) => {
	let msg = '';

	errors.array().forEach((err) => {
		const error = err as FieldValidationError;
		msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
	});

	return msg;
};
