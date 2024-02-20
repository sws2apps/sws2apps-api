import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import randomstring from 'randomstring';
import { sendPasswordlessLinkSignIn } from '../utils/sendEmail.js';
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

Users.prototype.findUserByLocalUid = function (uid) {
	const found = this.list.find((user) => user.user_local_uid === uid);
	return found;
};

Users.prototype.findUserByAuthUid = function (uid) {
	const found = this.list.find((user) => user.auth_uid === uid);
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
	const found = this.list.find((user) => user.user_local_uid === pocketId);
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

Users.prototype.create = async function (uid, firstname, lastname) {
	const data = {
		about: {
			firstname: { value: firstname, updatedAt: new Date().toISOString() },
			lastname: { value: lastname, updatedAt: new Date().toISOString() },
			role: 'vip',
			auth_uid: uid,
		},
	};

	const ref = await db.collection('users').add(data);
	const user = await this.addNew(ref.id);
	return user;
};

Users.prototype.createPasswordless = async function (email, uid, fullname) {
	await getAuth().updateUser(uid, { email });

	const data = {
		about: {
			role: 'vip',
			auth_uid: uid,
			name: fullname || '',
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

Users.prototype.createPasswordlessLink = async function (email, uid, language, origin) {
	const isDev = process.env.NODE_ENV === 'development';

	// find user by email
	const user = this.findUserByEmail(email);
	let token;

	if (!user) {
		const tempUid = randomstring.generate(28);
		token = await getAuth().createCustomToken(tempUid);
	}

	if (uid) {
		await getAuth().deleteUser(uid);
		await getAuth().createUser({ uid, email });
	}

	if (user) {
		token = await getAuth().createCustomToken(user.auth_uid);
	}

	const link = `${origin}/#/?code=${token}&user=${user ? 'edit' : 'create'}`;

	if (isDev) {
		console.log(`Please use this link to complete your sign: ${link}`);
		return link;
	}

	sendPasswordlessLinkSignIn(email, link, language);
};

Users.prototype.verifyPasswordlessLink = async function (code, fullname) {
	const decoded = jwt.verify(code, process.env.JWT_SECRET);

	// create a new user
	if (decoded.isNewUser) {
		if (!fullname) {
			throw new Error('fullname required');
		}

		const user = await this.create(fullname, decoded.email);
		return user;
	}

	// fetch user
	if (!decoded.isNewUser) {
		const user = this.findUserByEmail(decoded.email);
		return user;
	}
};

export const users = new Users();
