import assert from 'node:assert/strict';
import { test } from 'node:test';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { partnerMutationValidation, partnerResourceValidation } from '#modules/preaching-partner/partner.validation.js';
import { validateRequest } from '#http/validation-errors.js';

const app = express();
app.use(express.json());
app.post('/:id', partnerResourceValidation, partnerMutationValidation, validateRequest, (_req: Request, res: Response) => { res.sendStatus(204); });
const payload = () => ({ publisher_uid: 'actor', operationId: crypto.randomUUID(), action: 'create', request: { request_uid: crypto.randomUUID(), request_data: { date: '2030/01/02', updatedAt: new Date().toISOString(), flexible: 'U2FsdGVkX1Zg==', type: 'U2FsdGVkX1MA==', comment: 'U2FsdGVkX1IiI=' } } });

test('accepts the documented partner request envelope', async () => {
	assert.equal((await request(app).post('/congregation').send(payload())).status, 204);
});
test('rejects malformed and oversized input before controllers run', async () => {
	const malformed = [ {}, { ...payload(), action: 'overwrite' }, { ...payload(), operationId: 'bad' }, { ...payload(), withdrawRequestIds: Array(101).fill(crypto.randomUUID()) } ];
	for (const body of malformed) assert.equal((await request(app).post('/congregation').send(body)).status, 400);
	const invalid = payload(); invalid.request.request_data.comment = 'x'.repeat(48_001);
	assert.equal((await request(app).post('/congregation').send(invalid)).status, 400);
	const unsealed = payload() as { request: { request_data: Record<string, unknown> } }; unsealed.request.request_data.type = 0;
	assert.equal((await request(app).post('/congregation').send(unsealed)).status, 400);
	assert.equal((await request(app).post('/bad%2Fpath').send(payload())).status, 400);
});
