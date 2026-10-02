import { NextFunction, Request, Response } from 'express';
import { header, validationResult } from 'express-validator';

import { serverState } from '#platform/runtime/server-state.js';
import { formatError } from '#http/validation-errors.js';
import { isClientVersionSupported } from '#http/client-version.js';
import { sendClientError } from '#http/responses.js';

const numericVersionPattern = /^\d+(?:\.\d+)*$/;
const versionedAppClient = 'organized';

/**
 * Returns the declared client version, or `undefined` when the caller declared
 * none. Presence is read from the header key rather than its value so that an
 * empty `appversion` still counts as a declaration and is rejected as invalid
 * rather than being silently treated as absent.
 */
const readDeclaredClientVersion = (request: Request) => {
	if (!('appversion' in request.headers)) return undefined;
	return request.headers.appversion as string;
};

/**
 * Client identification is one-directional. A declared `appversion` is only
 * meaningful when it can be attributed to a client, so it requires `appclient`
 * and a lone version is rejected as invalid input. The reverse is allowed: a
 * caller may identify itself with `appclient` alone, because without a declared
 * version the Organized minimum-version rule cannot be evaluated. Internal
 * administration tooling relies on this, because the routes that mint the session
 * cookie sit behind this gate and it must not refuse requests it cannot judge.
 */
export const clientVersionChecker = () => {
	return async (request: Request, response: Response, next: NextFunction) => {
		try {
			const clientVersion = readDeclaredClientVersion(request);
			const appClientRule = header('appclient').isString().notEmpty();

			if (clientVersion === undefined) {
				await appClientRule.optional().run(request);
			} else {
				await appClientRule.run(request);
				await header('appversion').isString().notEmpty().matches(numericVersionPattern).run(request);
			}

			const validationErrors = validationResult(request);

			if (!validationErrors.isEmpty()) {
				const validationMessage = formatError(validationErrors);

				sendClientError(response, 400, 'INPUT_INVALID', `invalid input: ${validationMessage}`);

				return;
			}

			const appClient = request.headers.appclient as string;
			const isJudgeableOrganizedClient = clientVersion !== undefined
				&& appClient === versionedAppClient;

			if (!isJudgeableOrganizedClient) {
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
