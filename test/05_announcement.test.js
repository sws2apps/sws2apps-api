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
				.end((err, res) => {
					expect(res.body).to.be.an('array');
					done();
				});
		});
	});
});
