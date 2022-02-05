import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import { appVersion } from '../utils/server.mjs';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Middlewares', () => {
	describe('Testing request checker (error catch)', () => {
		before(() => {
			process.env.TEST_MIDDLEWARE_STATUS = 'error';
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
			process.env.TEST_MIDDLEWARE_STATUS = 'online';
		});
	});

	describe('Testing request checker (first request)', () => {
		before(() => {
			process.env.TEST_REQUEST_CHECKER_SNAP_EXIST = false;
		});

		it('It should return 200 code', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(200);
					done();
				});
		}).timeout(0);

		after(() => {
			process.env.TEST_REQUEST_CHECKER_SNAP_EXIST = undefined;
		});
	});

	describe('Testing request checker (concurrent request)', () => {
		before(() => {
			process.env.TEST_REQUEST_CHECKER_REQ_INPROGRESS = true;
		});

		it('It should return WAIT_FOR_REQUEST', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('WAIT_FOR_REQUEST');
					done();
				});
		}).timeout(0);

		after(() => {
			process.env.TEST_REQUEST_CHECKER_REQ_INPROGRESS = undefined;
		});
	});

	describe('Testing request checker (blocked IP)', () => {
		before(() => {
			process.env.TEST_REQUEST_CHECKER_IP_BLOCKED = true;
		});

		it('It should return BLOCKED_TEMPORARILY_TRY_AGAIN', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('BLOCKED_TEMPORARILY_TRY_AGAIN');
					done();
				});
		}).timeout(0);
	});

	describe('Testing request checker (unblocking IP)', () => {
		before(() => {
			process.env.TEST_REQUEST_CHECKER_IP_BLOCKED = false;
		});

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

		after(() => {
			process.env.TEST_REQUEST_CHECKER_IP_BLOCKED = undefined;
		});
	});

	describe('Testing request checker (blocking IP)', () => {
		before(() => {
			process.env.TES_REQUEST_CHECKER_FAILED_LOGIN = 3;
		});

		it('It should return BLOCKED_TEMPORARILY', (done) => {
			chai
				.request(app)
				.get('/')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(403);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('BLOCKED_TEMPORARILY');
					done();
				});
		}).timeout(0);

		after(() => {
			process.env.TES_REQUEST_CHECKER_FAILED_LOGIN = undefined;
		});
	});

	describe('Testing update checker (error catch)', () => {
		before(() => {
			process.env.TEST_UPDATE_TRACKER_STATUS = 'error';
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
			process.env.TEST_UPDATE_TRACKER_STATUS = undefined;
		});
	});

	describe('Testing auth checker (error catch)', () => {
		before(() => {
			process.env.TEST_AUTH_MIDDLEWARE_STATUS = 'error';
		});

		it('It should return an error', (done) => {
			chai
				.request(app)
				.get('/api/user/get-backup')
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
			process.env.TEST_AUTH_MIDDLEWARE_STATUS = undefined;
		});
	});

	describe('Testing auth checker (without uid)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.get('/api/user/get-backup')
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

	describe('Testing auth checker (with invalid uid)', () => {
		it('It should return FORBIDDEN', (done) => {
			chai
				.request(app)
				.get('/api/user/get-backup')
				.set('uid', 'dVtqMvCnbzXWigezhAyZ9CIqkGs')
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

	describe('Testing auth checker (passing invalid endpoint)', () => {
		it('It should return INVALID_ENDPOINT', (done) => {
			chai
				.request(app)
				.get('/api/user/get-backups')
				.end((err, res) => {
					if (err) done(err);
					expect(res).to.have.status(404);
					expect(res).to.have.property('body');
					expect(res.body).to.have.property('message');
					expect(res.body.message).to.equal('INVALID_ENDPOINT');
					done();
				});
		}).timeout(0);
	});

	describe('Testing sws pocket auth checker (error catch)', () => {
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

	describe('Testing sws pocket auth checker (without headers)', () => {
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

	describe('Testing sws pocket auth checker (invalid congregation ID)', () => {
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

	describe('Testing sws pocket auth checker (invalid congregation number)', () => {
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

	describe('Testing sws pocket auth checker (invalid user pin)', () => {
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
});
