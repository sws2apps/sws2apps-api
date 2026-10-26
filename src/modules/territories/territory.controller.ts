import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import {
	executeTerritoryBatch,
	executeTerritoryCommand,
	resolveTerritoryActor,
	retrieveTerritories,
	updateTerritoryPolicy,
} from './services/territory.service.js';
import {
	parseTerritoryBatch,
	isTerritoryId,
	parseTerritoryCommand,
	parseTerritoryPolicy,
} from './territory-validation.js';
import { TerritoryError } from './territory.types.js';

const getActor = (req: Request, res: Response) => {
	if (!isTerritoryId(req.params.id)) throw new TerritoryError('INPUT_INVALID');
	return resolveTerritoryActor(res.locals.currentUser, req.params.id);
};

const handleError = (error: unknown, res: Response) => {
	if (!(error instanceof TerritoryError)) throw error;
	const status = {
		INPUT_INVALID: 400,
		UNAUTHORIZED_ACCESS: 403,
		TERRITORY_CONFLICT: 409,
		TERRITORY_NOT_FOUND: 404,
		TERRITORY_LIMIT_EXCEEDED: 413,
	}[error.code];
	sendClientError(res, status, error.code, 'territory operation rejected');
};

export const getTerritories = async (req: Request, res: Response) => {
	try {
		const result = await retrieveTerritories(getActor(req, res));
		sendSuccess(res, result, 'territory snapshot retrieved');
	} catch (error) {
		handleError(error, res);
	}
};

export const putTerritoryPolicy = async (req: Request, res: Response) => {
	try {
		await updateTerritoryPolicy(getActor(req, res), parseTerritoryPolicy(req.body));
		sendSuccess(res, { message: 'TERRITORY_POLICY_UPDATED' }, 'territory policy updated');
	} catch (error) {
		handleError(error, res);
	}
};

export const postTerritoryCommand = async (req: Request, res: Response) => {
	try {
		const actor = getActor(req, res);
		if (!isTerritoryId(req.params.territoryId)) throw new TerritoryError('INPUT_INVALID');
		const result = await executeTerritoryCommand(
			actor,
			req.params.territoryId,
			parseTerritoryCommand(req.body),
		);
		sendSuccess(res, result, 'territory operation completed');
	} catch (error) {
		handleError(error, res);
	}
};

export const postTerritoryBatch = async (req: Request, res: Response) => {
	try {
		const result = await executeTerritoryBatch(getActor(req, res), parseTerritoryBatch(req.body));
		sendSuccess(res, result, 'territory batch completed');
	} catch (error) {
		handleError(error, res);
	}
};
