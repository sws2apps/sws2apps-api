import type { NextFunction, Request, Response } from 'express';
import { createRequire } from 'node:module';
import path from 'node:path';

import { sendClientError, setSuccessResponseLog } from './responses.js';

const require = createRequire(import.meta.url);
const swaggerAssetDirectory = path.dirname(require.resolve('swagger-ui-dist/package.json'));
const openApiContractPath = path.join(process.cwd(), 'docs', 'openapi', 'openapi.json');

const documentationAssets = new Map([
	['favicon-32x32.png', 'favicon-32x32.png'],
	['swagger-ui-bundle.js', 'swagger-ui-bundle.js'],
	['swagger-ui-standalone-preset.js', 'swagger-ui-standalone-preset.js'],
	['swagger-ui.css', 'swagger-ui.css'],
]);

const documentationPage = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="Interactive documentation for the sws2apps API">
		<title>sws2apps API documentation</title>
		<link rel="icon" type="image/png" href="/api-docs/assets/favicon-32x32.png">
		<link rel="stylesheet" href="/api-docs/assets/swagger-ui.css">
	</head>
	<body>
		<div id="swagger-ui"></div>
		<script src="/api-docs/assets/swagger-ui-bundle.js"></script>
		<script src="/api-docs/assets/swagger-ui-standalone-preset.js"></script>
		<script src="/api-docs/swagger-initializer.js"></script>
	</body>
</html>`;

const swaggerInitializer = `window.addEventListener('load', function () {
	window.ui = SwaggerUIBundle({
		url: '/api-docs/openapi.json',
		dom_id: '#swagger-ui',
		deepLinking: true,
		displayRequestDuration: true,
		filter: true,
		persistAuthorization: false,
		presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
		layout: 'StandaloneLayout',
		validatorUrl: null
	});
});`;

const sendDocumentationFile = (
	response: Response,
	next: NextFunction,
	filePath: string,
	logMessage: string,
) => {
	setSuccessResponseLog(response, logMessage);
	response.sendFile(filePath, (error) => {
		if (error) next(error);
	});
};

export const getApiDocumentation = (_request: Request, response: Response) => {
	setSuccessResponseLog(response, 'served API documentation page');
	response.type('html').send(documentationPage);
};

export const getOpenApiContract = (_request: Request, response: Response, next: NextFunction) => {
	sendDocumentationFile(response, next, openApiContractPath, 'served OpenAPI contract');
};

export const getSwaggerInitializer = (_request: Request, response: Response) => {
	setSuccessResponseLog(response, 'served Swagger UI initializer');
	response.type('application/javascript').send(swaggerInitializer);
};

export const getSwaggerAsset = (request: Request, response: Response, next: NextFunction) => {
	const assetFileName = request.params.asset;
	const allowedAsset = assetFileName ? documentationAssets.get(assetFileName) : undefined;

	if (!allowedAsset) {
		sendClientError(response, 404, 'error_api_invalid-endpoint', 'requested an unknown Swagger UI asset');
		return;
	}

	const assetPath = path.join(swaggerAssetDirectory, allowedAsset);
	sendDocumentationFile(response, next, assetPath, 'served Swagger UI asset');
};
