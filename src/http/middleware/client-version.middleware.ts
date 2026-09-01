import { NextFunction, Request, Response } from 'express';
import { header, validationResult } from 'express-validator';

import { serverState } from '#platform/runtime/server-state.js';
import { formatError } from '#http/validation-errors.js';
import { isClientVersionSupported } from '#http/client-version.js';
import { sendClientError } from '#http/responses.js';

export const clientVersionChecker = () => {
	return async (request: Request, response: Response, next: NextFunction) => {
		try {
			await header('appclient').isString().notEmpty().run(request);
			await header('appversion').isString().notEmpty().matches(/^\d+(?:\.\d+)*$/).run(request);

			const validationErrors = validationResult(request);

			if (!validationErrors.isEmpty()) {
				const validationMessage = formatError(validationErrors);

				sendClientError(response, 400, 'INPUT_INVALID', `invalid input: ${validationMessage}`);

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
				sendClientError(response, 400, 'CLIENT_VERSION_OUTDATED', 'client version outdated');
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};
