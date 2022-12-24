import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

describe('Testing signup', () => {
	describe('POST /api/users/create-account', () => {
		it('allow to create a new user', (done) => {
			chai
				.request(api)
				.post('/api/users/create-account')
				.send({ fullname: 'Test User 1', password: '1234567890', email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.email).to.be.equal('user@gmail.com');
					expect(res.body.fullname).to.be.equal('Test User 1');
					done();
				});
		});

		it('does not allow to create a duplicate user', (done) => {
			chai
				.request(api)
				.post('/api/users/create-account')
				.send({ fullname: 'Test User 1', password: '1234567890', email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(403);
					expect(res.body.message).to.be.equal('ACCOUNT_IN_USE');
					done();
				});
		});
	});

	describe('GET /api/users/resend-verification', () => {
		it('allows to resend verification email', (done) => {
			chai
				.request(api)
				.get('/api/users/resend-verification')
				.set('email', 'user@gmail.com')
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.message).to.be.equal('CHECK_EMAIL');
					done();
				});
		});

		it('does not allow resend verification for invalid email', (done) => {
			chai
				.request(api)
				.get('/api/users/resend-verification')
				.set('email', 'email4@gmail.com')
				.end((err, res) => {
					expect(res).to.have.status(404);
					expect(res.body.message).to.be.equal('ACCOUNT_NOT_FOUND');
					done();
				});
		});
	});
});
