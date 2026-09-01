import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { FieldValidationError, Result, ValidationError } from 'express-validator';
import { sendClientError } from '#http/responses.js';

export const formatError = (errors: Result<ValidationError>): string => {
	return errors
		.array()
		.map((error) => {
			const fieldError = error as FieldValidationError;

			return `${fieldError.path}: ${fieldError.msg}`;
		})
		.join(', ');
};

export const rejectInvalidRequest = (req: Request, res: Response): boolean => {
	const errors = validationResult(req);

	if (errors.isEmpty()) return false;

	sendClientError(
		res,
		400,
		'error_api_bad-request',
		`invalid input: ${formatError(errors)}`,
	);

	return true;
};

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
	if (rejectInvalidRequest(req, res)) return;
	next();
};
