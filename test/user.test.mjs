import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import crypto from 'crypto';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('User Route APIs', () => {
	describe('POST /api/user/login', () => {
		it('It should return verified', (done) => {
			chai
				.request(app)
				.post('/api/user/login')
				.send({
					email: 'sws2apps@gmail.com',
					password: 'sws2apps@gmail.com',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('verified');
					expect(res.body.verified).to.equal(true);
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/user/create-account', () => {
		it('It should return ACCOUNT_CREATED', (done) => {
			const randomEmail = `${crypto
				.randomBytes(4)
				.toString('hex')}@sws2apps.com`;

			chai
				.request(app)
				.post('/api/user/create-account')
				.send({
					email: randomEmail,
					password: 'testaccount@gmail.com',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('ACCOUNT_CREATED');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/user/resend-verification', () => {
		it('It should return CHECK_EMAIL', (done) => {
			chai
				.request(app)
				.post('/api/user/resend-verification')
				.send({
					email: 'sws2apps@gmail.com',
					password: 'sws2apps@gmail.com',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('CHECK_EMAIL');
					done();
				});
		}).timeout(0);
	});

	describe('GET /api/user/get-backup', () => {
		it('It should return NOT_FOUND', (done) => {
			chai
				.request(app)
				.get('/api/user/get-backup')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(404);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('NOT_FOUND');
					done();
				});
		}).timeout(0);
	});
});
