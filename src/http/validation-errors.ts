import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { FieldValidationError, Result, ValidationError } from 'express-validator';

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

	res.locals.type = 'warn';
	res.locals.message = `invalid input: ${formatError(errors)}`;
	res.status(400).json({ message: 'error_api_bad-request' });

	return true;
};
