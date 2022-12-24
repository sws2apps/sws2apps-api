import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { after, before } from 'mocha';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

describe('Testing user profile', () => {
	let visitorid;
	let userId;

	before(async () => {
		visitorid = global.visitorid;

		const token = global.userTotp.generate();
		const res = await chai.request(api).post('/api/mfa/verify-token').set({ visitorid, email: 'user@gmail.com' }).send({ token });
		userId = res.body.id;
	});

	describe('PATCH /api/users/:id/fullname', () => {
		it('allows user to change fullname', (done) => {
			chai
				.request(api)
				.patch(`/api/users/${userId}/fullname`)
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ fullname: 'Test User 10' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.fullname).to.be.equal('Test User 10');
					done();
				});
		});

		after(async () => {
			await chai
				.request(api)
				.patch(`/api/users/${userId}/fullname`)
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ fullname: 'Test User 1' });
		});
	});

	describe('testing change password', () => {
		describe('PATCH /api/users/:id/password', () => {
			it('allows user to change password', (done) => {
				chai
					.request(api)
					.patch(`/api/users/${userId}/password`)
					.set({ visitorid, email: 'user@gmail.com' })
					.send({ password: '0987654321' })
					.end((err, res) => {
						expect(res).to.have.status(200);
						done();
					});
			});

			it('confirms password was changed', (done) => {
				chai
					.request(api)
					.post('/user-login')
					.send({ visitorid, password: '0987654321', email: 'user@gmail.com' })
					.end((err, res) => {
						expect(res).to.have.status(200);
						done();
					});
			});
		});

		after(async () => {
			await chai
				.request(api)
				.patch(`/api/users/${userId}/password`)
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ password: '1234567890' });

			const token = global.userTotp.generate();
			await chai.request(api).post('/api/mfa/verify-token').set({ visitorid, email: 'user@gmail.com' }).send({ token });
		});
	});
});
