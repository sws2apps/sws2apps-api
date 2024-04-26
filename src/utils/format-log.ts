import requestIp from 'request-ip';
import { Request, Response } from 'express';

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
