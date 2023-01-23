import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { sendVerificationEmail } from '../utils/sendEmail.js';
import { dbFetchUsers } from '../utils/user-utils.js';
import { congregations } from './Congregations.js';
import { User } from './User.js';

const db = getFirestore(); //get default database

class Users {
	constructor() {
		this.list = [];
	}
}

Users.prototype.sort = function () {
	this.list.sort((a, b) => {
		return a.username > b.username ? 1 : -1;
	});
};

Users.prototype.addNew = async function (id) {
	const NewClass = new User(id);
	const newItem = await NewClass.loadDetails();
	this.list.push(newItem);
	this.sort();

	return newItem;
};

Users.prototype.loadAll = async function () {
	this.list = await dbFetchUsers();
	this.sort();
};

Users.prototype.findUserByEmail = function (email) {
	const found = this.list.find((user) => user.user_uid === email);
	return found;
};

Users.prototype.findUserById = function (id) {
	const found = this.list.find((user) => user.id === id);
	return found;
};

Users.prototype.findUserByOTPCode = function (code) {
	let user;

	// parse otp code
	const cong_number = code.split('-')[0];

	// get congregation
	const cong = congregations.findByNumber(cong_number);
	if (cong) {
		for (let i = 0; i < cong.cong_members.length; i++) {
			const item = cong.cong_members[i];
			if (code === item.pocket_oCode) {
				user = this.findUserById(item.id);
				break;
			}
		}
	}

	return user;
};

Users.prototype.findPocketUser = function (pocketId) {
	const found = this.list.find((user) => user.pocket_local_id === pocketId);
	return found;
};

Users.prototype.findPocketByVisitorId = async function (visitorid) {
	const users = this.list;

	let user;

	for (let i = 0; i < users.length; i++) {
		const devices = users[i].pocket_devices || [];
		const found = devices.find((device) => device.visitorid === visitorid);

		if (found) {
			user = users[i];
			break;
		}
	}

	return user;
};

Users.prototype.create = async function (fullname, email, password) {
	const isTesting = process.env.NODE_ENV === 'testing';
	const isDev = process.env.NODE_ENV === 'development';
	const isProd = process.env.NODE_ENV === 'production';

	const userData = {
		email: email,
		emailVerified: isTesting ? true : false,
		password: password,
		disabled: false,
	};

	const userRecord = await getAuth().createUser(userData);

	const userEmail = userRecord.email;
	const link = await getAuth().generateEmailVerificationLink(userEmail);

	if (isDev) {
		console.log(`Please use this link to verify your account: ${link}`);
	}

	if (isProd) sendVerificationEmail(userEmail, fullname, link);

	const data = {
		about: {
			name: fullname,
			role: 'vip',
			user_uid: userEmail,
		},
	};

	const ref = await db.collection('users').add(data);
	const user = await this.addNew(ref.id);
	return user;
};

Users.prototype.delete = async function (userId, authId) {
	await db.collection('users').doc(userId).delete();

	if (authId) await getAuth().deleteUser(authId);

	// get congregation id
	const user = this.findUserById(userId);
	const congId = user.cong_id;

	this.list = this.list.filter((user) => user.id !== userId);

	// update cong member if any
	if (congId !== '') {
		const cong = congregations.findCongregationById(congId);
		cong.reloadMembers();
	}
};

export const users = new Users();
