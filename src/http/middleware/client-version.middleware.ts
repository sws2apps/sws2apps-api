import { NextFunction, Request, Response } from 'express';
import { header, validationResult } from 'express-validator';

import { serverState } from '#platform/runtime/server-state.js';
import { formatError } from '#http/validation-errors.js';
import { isClientVersionSupported } from '#http/client-version.js';

export const clientVersionChecker = () => {
	return async (request: Request, response: Response, next: NextFunction) => {
		try {
			await header('appclient').isString().notEmpty().run(request);
			await header('appversion').isString().notEmpty().matches(/^\d+(?:\.\d+)*$/).run(request);

			const validationErrors = validationResult(request);

			if (!validationErrors.isEmpty()) {
				const validationMessage = formatError(validationErrors);

				response.locals.type = 'warn';
				response.locals.message = `invalid input: ${validationMessage}`;

				response.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const appClient = request.headers.appclient as string;
			const clientVersion = request.headers.appversion as string;

			if (appClient !== 'organized') {
				next();
				return;
			}

			const isSupported = isClientVersionSupported(clientVersion, serverState.minimumAppVersion);

			if (!isSupported) {
				response.locals.type = 'warn';
				response.locals.message = 'client version outdated';
				response.status(400).json({ message: 'CLIENT_VERSION_OUTDATED' });
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};
