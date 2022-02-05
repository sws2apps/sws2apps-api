import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Congregation Route APIs', () => {
	describe('GET /api/congregation/generate-id (error catch)', () => {
		before(() => {
			process.env.TEST_CONGREGATION_STATUS = 'error';
		});

		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.get('/api/congregation/generate-id')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
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
			process.env.TEST_CONGREGATION_STATUS = undefined;
		});
	});

	describe('GET /api/congregation/generate-id', () => {
		it('It should return a number', (done) => {
			chai
				.request(app)
				.get('/api/congregation/generate-id')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.be.a('number');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (error catch)', () => {
		before(() => {
			process.env.TEST_CONGREGATION_STATUS = 'error';
		});

		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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
			process.env.TEST_CONGREGATION_STATUS = undefined;
		});
	});

	describe('POST /api/congregation/create-account (missing congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (invalid congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '123456789',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (missing congregation password)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (invalid congregation password)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (missing congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (invalid congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: '',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (missing congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account (invalid congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: 'test',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/create-account', () => {
		it('It should return OK', (done) => {
			chai
				.request(app)
				.post('/api/congregation/create-account')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('OK');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (error catch)', () => {
		before(() => {
			process.env.TEST_CONGREGATION_STATUS = 'error';
		});

		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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
			process.env.TEST_CONGREGATION_STATUS = undefined;
		});
	});

	describe('POST /api/congregation/signin (missing congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (invalid congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '123456789',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (missing congregation password)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (invalid congregation password)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (missing congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (invalid congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: '',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (missing congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (invalid congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: 'test',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/signin (wrong congregation id)', () => {
		it('It should return NOT_FOUND', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '0000000000',
					cong_password: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/signin (wrong password)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '6220233869',
					cong_password: '00000000',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/signin (wrong email)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'TXoQPwodHLQdvLfT4eJWZey6GSb2')
				.send({
					cong_id: '6220233869',
					cong_password: 'sws2apps@gmail.com',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/signin', () => {
		it('It should return OK', (done) => {
			chai
				.request(app)
				.post('/api/congregation/signin')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '6220233869',
					cong_password: 'sws2apps@gmail.com',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('OK');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (error catch)', () => {
		before(() => {
			process.env.TEST_CONGREGATION_STATUS = 'error';
		});

		it('It should return INTERNAL_ERROR', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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
			process.env.TEST_CONGREGATION_STATUS = undefined;
		});
	});

	describe('POST /api/congregation/change-password (missing congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (invalid congregation id)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '123456789',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (missing congregation password)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (invalid congregation password old)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (invalid congregation password new)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (missing congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (invalid congregation name)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
					cong_name: '',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (missing congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
					cong_name: 'Congregation name',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (invalid congregation number)', () => {
		it('It should return INPUT_INVALID', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '1234567890',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
					cong_name: 'Congregation name',
					cong_number: 'test',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(400);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INPUT_INVALID');
					done();
				});
		}).timeout(0);
	});

	describe('POST /api/congregation/change-password (wrong congregation id)', () => {
		it('It should return NOT_FOUND', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '0000000000',
					cong_password_old: '12345678',
					cong_password_new: '12345678',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/change-password (wrong password)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '6220233869',
					cong_password_old: '00000000',
					cong_password_new: 'sws2apps@gmail.com',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/change-password (wrong email)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'TXoQPwodHLQdvLfT4eJWZey6GSb2')
				.send({
					cong_id: '6220233869',
					cong_password_old: 'sws2apps@gmail.com',
					cong_password_new: 'sws2apps@gmail.com',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
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

	describe('POST /api/congregation/change-password', () => {
		it('It should return OK', (done) => {
			chai
				.request(app)
				.post('/api/congregation/change-password')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs2')
				.send({
					cong_id: '6220233869',
					cong_password_old: 'sws2apps@gmail.com',
					cong_password_new: 'sws2apps@gmail.com',
					cong_name: 'Congregation name',
					cong_number: '1234',
				})
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('OK');
					done();
				});
		}).timeout(0);
	});
});
