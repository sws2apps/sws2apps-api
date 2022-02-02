import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import { appVersion } from '../utils/server.mjs';

import app from '../routes/app.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Main Route APIs', () => {
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

	describe('GET / Testing server error scenario', () => {
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

	describe('Testing request checker middleware (error catch)', () => {
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

	describe('Testing request checker middleware (first request)', () => {
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

	describe('Testing request checker middleware (concurrent request)', () => {
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

	describe('Testing request checker middleware (blocked IP)', () => {
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

	describe('Testing request checker middleware (unblocking IP)', () => {
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

	describe('Testing request checker middleware (blocking IP)', () => {
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
