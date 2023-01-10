import 'dotenv/config';
import chai from 'chai';
import chaiHttp from 'chai-http';
import * as OTPAuth from 'otpauth';
import { before } from 'mocha';
import { api } from '../index.js';
import puppeteer from 'puppeteer';

const expect = chai.expect;

chai.use(chaiHttp);

global.userTotp = '';
global.visitorid = '';

describe('Testing signin', () => {
	let visitorid;
	let userTotp;

	before(async () => {
		// get fingerprint visitor id
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.goto('https://www.google.com');
		const id = await page.evaluate(async () => {
			const FingerprintJS = await import('https://fpjscdn.net/v3/ReXJ93Fmp7vvQKdkSphj');
			const fp = await FingerprintJS.load();
			const result = await fp.get();
			return result.visitorId;
		});
		visitorid = id;
		global.visitorid = id;
		await browser.close();

		// define user totp for later use
		const { body } = await chai
			.request(api)
			.post('/user-login')
			.send({ visitorid, password: '1234567890', email: 'user@gmail.com' });
		const { secret } = body;
		userTotp = new OTPAuth.TOTP({
			issuer: 'sws2apps-test',
			label: 'user@gmail.com',
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: OTPAuth.Secret.fromBase32(secret),
		});

		global.userTotp = userTotp;
	});

	describe('POST /users-login', () => {
		it('does not allow invalid password to login', (done) => {
			chai
				.request(api)
				.post('/user-login')
				.send({ visitorid, password: '123456780', email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(400);
					expect(res.body.message).to.be.equal('INVALID_PASSWORD');
					done();
				});
		});

		it('does not allow invalid email to login', (done) => {
			chai
				.request(api)
				.post('/user-login')
				.send({ visitorid, password: '1234567890', email: 'email4@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(400);
					expect(res.body.message).to.be.equal('EMAIL_NOT_FOUND');
					done();
				});
		});

		it('allow the new user to login', (done) => {
			chai
				.request(api)
				.post('/user-login')
				.send({ visitorid, password: '1234567890', email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(403);
					expect(res.body).to.have.property('secret');
					expect(res.body).to.have.property('qrCode');
					expect(res.body).to.have.property('version').equal(2);
					done();
				});
		});
	});

	describe('POST /api/mfa/verify-token', () => {
		it('does not allow invalid token to login', (done) => {
			const token = 100000;
			chai
				.request(api)
				.post('/api/mfa/verify-token')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ token })
				.end((err, res) => {
					expect(res).to.have.status(403);
					expect(res.body.message).to.be.equal('TOKEN_INVALID');
					done();
				});
		});

		it('allows valid token to login', (done) => {
			const token = userTotp.generate();

			chai
				.request(api)
				.post('/api/mfa/verify-token')
				.set({ visitorid, email: 'user@gmail.com' })
				.send({ token })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.message).to.be.equal('TOKEN_VALID');
					done();
				});
		});
	});

	describe('POST /users-login', () => {
		it('allow the existing user to login', (done) => {
			chai
				.request(api)
				.post('/user-login')
				.send({ visitorid, password: '1234567890', email: 'user@gmail.com' })
				.end((err, res) => {
					expect(res).to.have.status(200);
					expect(res.body.message).to.be.equal('MFA_VERIFY');
					done();
				});
		});
	});
});
