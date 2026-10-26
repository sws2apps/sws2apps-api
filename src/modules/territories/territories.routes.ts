import express from 'express';
import { requireTerritorySession } from './territory-authentication.js';
import {
	postTerritoryBatch,
	getTerritories,
	postTerritoryCommand,
	putTerritoryPolicy,
} from './territory.controller.js';

const territoryRouter = express.Router({ mergeParams: true });
territoryRouter.use(requireTerritorySession());
territoryRouter.get('/', getTerritories);
territoryRouter.put('/policy', putTerritoryPolicy);
territoryRouter.post('/commands', postTerritoryBatch);
territoryRouter.post('/:territoryId/commands', postTerritoryCommand);
export default territoryRouter;
