import CryptoES from 'crypto-es';

const SERVER_KEY = `&sws2apps_${process.env.SEC_ENCRYPT_KEY ?? 'server_key_dev'}`;

export const encryptData = (data: string) => {
	const encryptedData = CryptoES.AES.encrypt(data, SERVER_KEY).toString();
	return encryptedData;
};

export const decryptData = (data: string) => {
	const decryptedData = CryptoES.AES.decrypt(data, SERVER_KEY);
	const str = decryptedData.toString(CryptoES.enc.Utf8);
	return str;
};
