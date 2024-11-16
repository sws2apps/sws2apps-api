import CryptoES from 'crypto-es';

const SERVER_KEY = `&sws2apps_${process.env.SEC_ENCRYPT_KEY ?? 'server_key_dev'}`;

export const encryptData = (data: string, passphrase?: string) => {
	const key = passphrase || SERVER_KEY;

	const encryptedData = CryptoES.AES.encrypt(data, key).toString();
	return encryptedData;
};

export const decryptData = (data: string, passphrase?: string) => {
	try {
		const key = passphrase || SERVER_KEY;

		const decryptedData = CryptoES.AES.decrypt(data, key);
		const str = decryptedData.toString(CryptoES.enc.Utf8);
		return str;
	} catch {
		return;
	}
};
