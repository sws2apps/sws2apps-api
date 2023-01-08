import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

describe('Testing announcements', () => {
	describe('GET /api/users/announcement', () => {
		it('allow user to fetch announcements', (done) => {
			chai
				.request(api)
				.get('/api/users/announcement')
				.send({ app: 'lmm-oa' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.status).to.be.an('array');
					done();
				});
		});
	});

	describe('GET /api/users/announcement', () => {
		it('does not allow user to fetch announcements with invalid app', (done) => {
			chai
				.request(api)
				.get('/api/users/announcement')
				.send({ app: 'junk' })
				.end((err, res) => {
					expect(res).to.have.status(400);
					done();
				});
		});
	});
});
