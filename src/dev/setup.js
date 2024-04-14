// all db initialization for dev
import fs from 'fs/promises';
import * as OTPAuth from 'otpauth';

import { publicTalks } from '../classes/PublicTalk.js';
import { decryptData } from '../utils/encryption-utils.js';

export const importPublicTalks = async () => {
	const rootDir = './src/dev/S-34';
	const files = await fs.readdir('./src/dev/S-34');

	for await (const file of files) {
		if (file.endsWith('.json')) {
			const filepath = rootDir + '/' + file;
			const content = await fs.readFile(filepath, 'utf-8');
			const talks = JSON.parse(content);
			const language = file.split('.')[0].toUpperCase();

			const talksToUpdate = [];

			for (const talk of talks) {
				const findTalk = publicTalks.find(talk.talk_number);
				let update = false;

				if (!findTalk) update = true;

				if (findTalk && !findTalk[language]) update = true;

				if (findTalk && findTalk[language] && talk.talk_title !== findTalk[language].title) update = true;

				if (update) {
					talksToUpdate.push(talk);
				}
			}

			for await (const talk of talksToUpdate) {
				const payload = { talk_number: talk.talk_number, title: talk.title, updatedAt: new Date().toISOString() };
				await publicTalks.update(language, payload);
			}
		}
	}
};

export const generateTokenDev = (userUID, userSecret) => {
	const { secret } = JSON.parse(decryptData(userSecret));
	const totp = new OTPAuth.TOTP({
		issuer: 'sws2apps-test',
		label: userUID,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	});

	return totp.generate();
};
