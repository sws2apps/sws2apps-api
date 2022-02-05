import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('SWS Pocket Route APIs', () => {
	describe('GET /api/sws-pocket/login', () => {
		it('It should return USER_LOGGED', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.set('cong_id', '6220233869')
				.set('cong_num', '1234')
				.set('user_pin', '123456')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('USER_LOGGED');
					done();
				});
		}).timeout(0);
	});
});
