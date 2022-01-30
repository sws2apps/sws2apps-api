import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import { appVersion } from '../utils/server.mjs';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Main Route APIs', () => {
	describe('GET /', () => {
		it('It should return the app name', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res.text).to.equal(`SWS Apps API services v${appVersion}`);
					done();
				});
		}).timeout(0);
	});

	describe('GET /not-found', () => {
		it('It should return an invalid endpoint', (done) => {
			chai
				.request(app)
				.get('/not-found')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(404);
					expect(res.body.message).to.equal('INVALID_ENDPOINT');
					done();
				});
		}).timeout(0);
	});
});
