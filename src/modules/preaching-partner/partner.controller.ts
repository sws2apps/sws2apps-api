import type { NextFunction, Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import { partnerService } from './partner.service.js';
import { PartnerError, type PartnerMutation } from './partner.types.js';

const respond = async (res: Response, next: NextFunction, action: () => Promise<unknown>) => {
	try {
		sendSuccess(res, { requests: await action() }, 'partner request operation completed');
	} catch (error) {
		if (error instanceof PartnerError) sendClientError(res, error.status, error.code, 'partner request operation rejected');
		else next(error);
	}
};

export const listPartnerRequests = (req: Request, res: Response, next: NextFunction) =>
	respond(res, next, () => partnerService.list(res.locals.currentUser.id, String(req.params.id)));

export const mutatePartnerRequest = (req: Request, res: Response, next: NextFunction) =>
	respond(res, next, () => partnerService.mutate(res.locals.currentUser.id, String(req.params.id), req.body as PartnerMutation));
