import { body, param } from 'express-validator';
import { REQUEST_LIMITS } from '#http/request-limits.js';

export const partnerResourceValidation = [param('id').isString().matches(/^[a-zA-Z0-9_-]+$/).isLength({ max: REQUEST_LIMITS.identifier })];
export const partnerMutationValidation = [
	body('operationId').isUUID(),
	body('publisher_uid').isString().notEmpty().isLength({ max: REQUEST_LIMITS.identifier }),
	body('action').isIn(['create', 'edit', 'join', 'cancel', 'delete']),
	body('request').isObject(),
	body('request.request_uid').isUUID(),
	body('request.request_data').isObject(),
	body('request.request_data.date').isString().isLength({ max: 10 }),
	body('request.request_data.updatedAt').isISO8601({ strict: true }),
	body('request.request_data.flexible').isBoolean({ strict: true }),
	body('request.request_data.type').isInt({ min: 0, max: 5 }),
	body('request.request_data.comment').isString().isLength({ max: REQUEST_LIMITS.messageBody }),
	body('request.request_data.start').optional().isString().isLength({ max: 5 }),
	body('request.request_data.end').optional().isString().isLength({ max: 5 }),
	body('withdrawRequestIds').optional().isArray({ max: 100 }),
	body('withdrawRequestIds.*').isUUID(),
];
