import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('SWS Pocket Route APIs', () => {
	describe('Testing sws pocket auth checker middleware (error catch)', () => {
		before(() => {
			process.env.TEST_POCKET_MIDDLEWARE_STATUS = 'error';
		});

		it('It should return an error', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
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
			process.env.TEST_POCKET_MIDDLEWARE_STATUS = undefined;
		});
	});

	describe('GET /api/sws-pocket/login (without headers)', () => {
		it('It should return MISSING_INFO', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('MISSING_INFO');
					done();
				});
		}).timeout(0);
	});

	describe('GET /api/sws-pocket/login (invalid congregation ID)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.set('cong_id', '123456789')
				.set('cong_num', '1234')
				.set('user_pin', '123456')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('FORBIDDEN');
					done();
				});
		}).timeout(0);
	});

	describe('GET /api/sws-pocket/login (invalid congregation number)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.set('cong_id', '6838038446')
				.set('cong_num', '0000')
				.set('user_pin', '123456')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('FORBIDDEN');
					done();
				});
		}).timeout(0);
	});

	describe('GET /api/sws-pocket/login (invalid user pin)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.set('cong_id', '6838038446')
				.set('cong_num', '1234')
				.set('user_pin', '000000')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('FORBIDDEN');
					done();
				});
		}).timeout(0);
	});

	describe('GET /api/sws-pocket/login', () => {
		it('It should return USER_LOGGED', (done) => {
			chai
				.request(app)
				.get('/api/sws-pocket/login')
				.set('cong_id', '6838038446')
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
