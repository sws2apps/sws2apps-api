// utilities
import { getUsers } from './user-utils.js';
import { decryptData } from './encryption-utils.js';

export const findPocketByVisitorID = async (visitor_id) => {
	const users = await getUsers();

	let user;

	for (let i = 0; i < users.length; i++) {
		const devices = users[i].pocket_devices || [];
		const found = devices.find((device) => device === visitor_id);

		if (found) {
			user = users[i];
			break;
		}
	}

	return user;
};

export const findUserByOTPCode = async (otp_code) => {
	const users = await getUsers();

	let user;
	for (let i = 0; i < users.length; i++) {
		const otpCode = users[i].pocket_oCode;

		if (otpCode && otpCode !== '') {
			const pocket_oCode = decryptData(otpCode);

			if (otp_code === pocket_oCode) {
				user = users[i];
				break;
			}
		}
	}

	return user;
};
