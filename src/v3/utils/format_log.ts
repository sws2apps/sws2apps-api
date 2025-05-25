import { FieldValidationError, Result, ValidationError } from 'express-validator';

export const formatError = (errors: Result<ValidationError>) => {
	let msg = '';

	errors.array().forEach((err) => {
		const error = err as FieldValidationError;
		msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
	});

	return msg;
};
