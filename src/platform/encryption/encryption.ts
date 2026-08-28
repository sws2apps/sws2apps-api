import { AES, Utf8 } from 'crypto-es';
import { env } from '../../config/env.js';

const serverPassphrase = `&sws2apps_${env.encryptionKey}`;

const resolvePassphrase = (passphrase?: string): string => {
	return passphrase || serverPassphrase;
};

export const encryptData = (plainText: string, passphrase?: string): string => {
	const encryptionPassphrase = resolvePassphrase(passphrase);

	return AES.encrypt(plainText, encryptionPassphrase).toString();
};

export const decryptData = (
	encryptedText: string,
	passphrase?: string
): string | undefined => {
	try {
		const encryptionPassphrase = resolvePassphrase(passphrase);
		const decryptedBytes = AES.decrypt(encryptedText, encryptionPassphrase);

		return decryptedBytes.toString(Utf8);
	} catch {
		return undefined;
	}
};
