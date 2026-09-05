import express from 'express';

import {
	getApiDocumentation,
	getOpenApiContract,
	getSwaggerAsset,
	getSwaggerInitializer,
} from './api-documentation.controller.js';

const apiDocumentationRouter = express.Router();

apiDocumentationRouter.get('/', getApiDocumentation);
apiDocumentationRouter.get('/openapi.json', getOpenApiContract);
apiDocumentationRouter.get('/swagger-initializer.js', getSwaggerInitializer);
apiDocumentationRouter.get('/assets/:asset', getSwaggerAsset);

export default apiDocumentationRouter;
