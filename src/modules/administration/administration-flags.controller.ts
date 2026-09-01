import type { Request, Response } from 'express';

import type { FeatureFlag } from '#modules/feature-flags/index.js';
import {
	AdministrationFlagError,
	createAdministrationFlag,
	deleteAdministrationFlag,
	getAdministrationFlags,
	toggleAdministrationFlag,
	toggleCongregationFlag,
	toggleUserFlag,
	updateAdministrationFlag,
} from './administration-flags.service.js';

const handleAdministrationFlagError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof AdministrationFlagError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'USER_NOT_FOUND') {
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
		return true;
	}

	res.locals.message = 'no flag could not be found with the provided id';
	res.status(404).json({ message: 'FLAG_NOT_FOUND' });
	return true;
};

export const flagsGet = async (_req: Request, res: Response) => {
	const result = getAdministrationFlags();

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all feature flags';
	res.status(200).json(result);
};

export const flagsCreate = async (req: Request, res: Response) => {
	const name = req.body.name as string;
	const description = req.body.desc as string;
	const availability = req.body.availability as FeatureFlag['availability'];
	const result = await createAdministrationFlag(name, description, availability);

	res.locals.type = 'info';
	res.locals.message = 'admin created new feature flag';
	res.status(200).json(result);
};

export const flagDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const result = await deleteAdministrationFlag(id);

	res.locals.type = 'info';
	res.locals.message = 'admin deleted a feature flag';
	res.status(200).json(result);
};

export const flagUpdate = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const result = await updateAdministrationFlag(
		id,
		req.body.name as string,
		req.body.description as string,
		req.body.coverage as number,
	);

	if (!result) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated a feature flag';
	res.status(200).json(result);
};

export const flagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	const result = await toggleAdministrationFlag(id);
	if (!result) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated feature flag status';
	res.status(200).json(result);
};

export const userFlagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	let result;
	try {
		result = await toggleUserFlag(id, req.body.flagid as string);
	} catch (error) {
		if (!handleAdministrationFlagError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated user feature toggle';
	res.status(200).json(result);
};

export const congregationFlagToggle = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });
		return;
	}

	let result;
	try {
		result = await toggleCongregationFlag(id, req.body.flagid as string);
	} catch (error) {
		if (!handleAdministrationFlagError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'admin updated congregation feature toggle';
	res.status(200).json(result);
};
