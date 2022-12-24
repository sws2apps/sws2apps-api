import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { before } from 'mocha';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

describe('Testing congregation signin and approval', () => {
	let visitorid;

	before(async () => {
		visitorid = global.visitorid;

		const token = global.userTotp.generate();
		await chai.request(api).post('/api/mfa/verify-token').set({ visitorid, email: 'user@gmail.com' }).send({ token });
	});

	describe('PUT /api/congregations', () => {
		it('allows user to create a new congregation request', (done) => {
			chai
				.request(api)
				.put('/api/congregations')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ email: 'user@gmail.com', cong_name: 'Test Congregation', cong_number: 1234, app_requestor: 'lmmo' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.cong_name).to.be.equal('Test Congregation');
					expect(res.body.cong_number).to.be.equal(1234);
					done();
				});
		});

		it('does not allow user to create two requests at the same time', (done) => {
			chai
				.request(api)
				.put('/api/congregations')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ email: 'user@gmail.com', cong_name: 'Test Congregation', cong_number: 1234, app_requestor: 'lmmo' })
				.end((err, res) => {
					expect(res).to.have.status(405);
					expect(res.body.message).to.be.equal('REQUEST_EXIST');
					done();
				});
		});
	});

	describe('PUT /api/admin/congregations/:id/disapprove', () => {
		let reqId;
		before(async () => {
			const res = await chai.request(api).get('/api/admin/congregations/requests').set({ visitorid, email: 'admin@gmail.com' });
			const requests = res.body;
			reqId = requests[0].id;
		});

		it('allows admin to disapprove congregation request', (done) => {
			chai
				.request(api)
				.put(`/api/admin/congregations/${reqId}/disapprove`)
				.set({ visitorid, email: 'admin@gmail.com' })
				.send({ reason: 'Not a valid congregation information' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					done();
				});
		});

		it('confirms congregation request was disapproved', (done) => {
			chai
				.request(api)
				.put(`/api/admin/congregations/${reqId}/disapprove`)
				.set({ visitorid, email: 'admin@gmail.com' })
				.send({ reason: 'Not a valid congregation information' })
				.end((err, res) => {
					expect(res).to.have.status(404);
					expect(res.body.message).to.be.equal('REQUEST_NOT_FOUND');
					done();
				});
		});
	});

	describe('PUT /api/admin/congregations/:id/approve', () => {
		let reqId;
		before(async () => {
			await chai
				.request(api)
				.put('/api/congregations')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ email: 'user@gmail.com', cong_name: 'Test Congregation', cong_number: 1234, app_requestor: 'lmmo' });

			const res = await chai.request(api).get('/api/admin/congregations/requests').set({ visitorid, email: 'admin@gmail.com' });
			const requests = res.body;
			reqId = requests[0].id;
		});

		it('allows admin to approve congregation request', (done) => {
			chai
				.request(api)
				.put(`/api/admin/congregations/${reqId}/approve`)
				.set({ visitorid, email: 'admin@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.cong_name).to.be.equal('Test Congregation');
					expect(res.body.cong_number).to.be.equal(1234);
					expect(res.body.user_cong_name).to.be.equal('Test Congregation');
					done();
				});
		});

		it('confirms congregation request was approved', (done) => {
			chai
				.request(api)
				.put(`/api/admin/congregations/${reqId}/approve`)
				.set({ visitorid, email: 'admin@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(404);
					expect(res.body.message).to.be.equal('REQUEST_NOT_FOUND');
					done();
				});
		});
	});
});
