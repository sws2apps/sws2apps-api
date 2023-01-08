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
				.send({
					email: 'user@gmail.com',
					country_code: 'MDG',
					cong_name: 'Test Congregation',
					cong_number: 1234,
					app_requestor: 'lmmo',
				})
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.cong_name).to.be.equal('Test Congregation');
					expect(res.body.cong_number).to.be.equal('1234');
					done();
				});
		});

		it('does not allow user to create two requests at the same time', (done) => {
			chai
				.request(api)
				.put('/api/congregations')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({
					email: 'user@gmail.com',
					country_code: 'MDG',
					cong_name: 'Test Congregation',
					cong_number: 1234,
					app_requestor: 'lmmo',
				})
				.end((err, res) => {
					expect(res).to.have.status(404);
					expect(res.body.message).to.be.equal('CONG_EXISTS');
					done();
				});
		});
	});
});
