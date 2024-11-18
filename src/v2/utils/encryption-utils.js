import Cryptr from 'cryptr';

const myKey = `&sws2apps_${process.env.SEC_ENCRYPT_KEY}`;
const cryptr = new Cryptr(myKey);

export const encryptData = (data) => {
	if (typeof data !== 'string') data = JSON.stringify(data);
	return cryptr.encrypt(data);
};

export const decryptData = (data) => {
	return cryptr.decrypt(data);
};
