import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Server Functionality', () => {
	describe('Testing server internet offline scenario', () => {
		before(() => {
			process.env.TEST_SERVER_STATUS = 'offline';
		});

		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(500);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INTERNAL_ERROR');
					done();
				});
		}).timeout(0);

		after(() => {
			process.env.TEST_SERVER_STATUS = 'error';
		});
	});

	describe('Testing server internet error scenario', () => {
		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(500);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INTERNAL_ERROR');
					done();
				});
		}).timeout(0);
	});

	describe('Testing server error scenario', () => {
		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(500);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INTERNAL_ERROR');
					done();
				});
		}).timeout(0);

		after(() => {
			process.env.TEST_SERVER_STATUS = 'online';
		});
	});
});
