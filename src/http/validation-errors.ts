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
