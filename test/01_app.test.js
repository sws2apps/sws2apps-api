import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { api } from '../index.js';

const expect = chai.expect;

chai.use(chaiHttp);

const appVersion = `SWS Apps API services v${process.env.npm_package_version}`;

describe('Server booting up', () => {
	describe('GET /', () => {
		it('open main route', (done) => {
			chai
				.request(api)
				.get('/')
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.message).to.be.equal(appVersion);
					done();
				});
		});
	});

	describe('GET /api/public/source-material/:lang', () => {
		const languages = [
			{ code: 'e', name: 'english' },
			{ code: 'mg', name: 'malagasy' },
		];

		for (let i = 0; i < languages.length; i++) {
			const language = languages[i];

			it(`the ${language.name} source materials is loaded`, (done) => {
				chai
					.request(api)
					.get(`/api/public/source-material/${language.code}`)
					.end((err, res) => {
						expect(res.body).to.be.an('array');
						done();
					});
			});
		}
	});
});
