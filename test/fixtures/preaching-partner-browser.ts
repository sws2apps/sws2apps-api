import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { param } from 'express-validator';
import '#platform/firebase/firebase-app.js';
import { env } from '#config/env.js';
import { UsersList, type UserSession } from '#modules/users/index.js';
import { User } from '#modules/users/user.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import routes from '#modules/preaching-partner/routes.js';
import { partnerService } from '#modules/preaching-partner/index.js';
import { validateRequest } from '#http/validation-errors.js';

// This fixture can never connect to production persistence or bind a public interface.
if (!env.isTest || !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '')) {
	throw new Error('Partner browser fixture requires NODE_ENV=test and a local Storage emulator');
}
const congregation = new Congregation('partner-browser-fixture');
congregation.settings.data_sync.value = true;
CongregationsList.list = [congregation];
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:4071', credentials: true }), express.json(), cookieParser(env.encryptionKey));
app.post('/__fixture/:name/:person', param('name').isIn(['alice', 'bob', 'carol']), param('person').isUUID(), validateRequest, (req, res) => {
	const id = String(req.params.name);
	let user = UsersList.findById(id);
	if (!user) {
		user = new User(id);
		UsersList.add(user);
	}
	user.profile.congregation = { id: congregation.id, account_type: 'pocket', cong_role: ['publisher'], user_local_uid: String(req.params.person) };
	user.sessions = [{ visitorid: id, identifier: id, last_seen: new Date().toISOString() } as UserSession];
	res.cookie('visitorid', id, { signed: true, httpOnly: true, sameSite: 'lax' }).json({ id });
});
app.get('/__fixture/health', async (_req, res, next) => {
	try {
		const user = UsersList.list[0];
		if (user) await partnerService.list(user.id, congregation.id);
		res.json({ ready: true });
	} catch (error) {
		next(error);
	}
});
app.use('/api/v3/preaching-partner', routes);
app.listen(4081, '127.0.0.1', () => process.stdout.write('Partner browser fixture ready on 127.0.0.1:4081\n'));
