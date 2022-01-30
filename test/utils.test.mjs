import 'dotenv/config';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import { sendVerificationEmail } from '../utils/sendEmail.mjs';

process.env.NODE_ENV = 'testing';

chai.should();
chai.use(chaiHttp);

describe('Utilities', () => {
	describe('Send Verification email', () => {
		it('It should return true', (done) => {
			sendVerificationEmail(
				'0ceb1466-0a8c-4c3e-818e-af42e609493c@mailslurp.mx',
				'https://www.google.com'
			).then((result) => {
				expect(result).to.equal(true);
				done();
			});
		}).timeout(0);
	});
});
