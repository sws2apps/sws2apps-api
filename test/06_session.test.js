import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { before } from 'mocha';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

describe('Testing user session', () => {
	let visitorid;

	before(async () => {
		visitorid = global.visitorid;
		await chai.request(api).post('/user-login').send({ visitorid, password: '1234567890', email: 'user@gmail.com' });
	});

	describe('GET /api/users/validate-me', () => {
		it('does not allow user without verified visitor id to login', (done) => {
			chai
				.request(api)
				.get('/api/users/validate-me')
				.set({ visitorid, email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(403);
					expect(res.body.message).to.be.equal('LOGIN_FIRST');
					done();
				});
		});

		describe('if user is authenticated', () => {
			before(async () => {
				const token = global.userTotp.generate();
				await chai.request(api).post('/api/mfa/verify-token').set({ visitorid, email: 'user@gmail.com' }).send({ token });
			});

			it('allows user with verified visitor id to login', (done) => {
				chai
					.request(api)
					.get('/api/users/validate-me')
					.set({ visitorid, email: 'user@gmail.com' })
					.end((err, res) => {
						expect(res).to.have.status(200);
						done();
					});
			});
		});
	});
});
