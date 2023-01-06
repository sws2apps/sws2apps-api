import express from 'express';
import { body } from 'express-validator';
import { congBulkImport, geoBulkImport, getCountries } from '../controllers/admin-geo-controller.js';

const router = express.Router();

// get all countries
router.get('/', getCountries);

// bulk add geo
router.put('/import', body('geo_list').isArray().notEmpty(), body('language').isString().notEmpty(), geoBulkImport);

// bulk add congregations
router.put('/:id/import', body('cong_list').isArray().notEmpty(), body('language').isString().notEmpty(), congBulkImport);

export default router;
