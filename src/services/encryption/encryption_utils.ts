import Cryptr from 'cryptr';

const myKey = `&sws2apps_${process.env.SEC_ENCRYPT_KEY}`;
const cryptr = new Cryptr(myKey);

export const encryptData = (data: string) => {
	return cryptr.encrypt(data);
};

export const decryptData = (data: string) => {
	return cryptr.decrypt(data);
};
