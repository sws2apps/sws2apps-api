import express from 'express';
import { requireAuthenticatedSession } from '#http/middleware/session-authentication.middleware.js';
import {
	postTerritoryBatch,
	getTerritories,
	postTerritoryCommand,
	putTerritoryPolicy,
} from './territory.controller.js';

const territoryRouter = express.Router({ mergeParams: true });
territoryRouter.use(requireAuthenticatedSession());
territoryRouter.get('/', getTerritories);
territoryRouter.put('/policy', putTerritoryPolicy);
territoryRouter.post('/commands', postTerritoryBatch);
territoryRouter.post('/:territoryId/commands', postTerritoryCommand);
export default territoryRouter;
