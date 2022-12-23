import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { remoteApp } from '../config/firebase-config.js';
import { decryptData } from '../utils/encryption-utils.js';
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
  for (let i = 0; i < this.list.length; i++) {
    const item = this.list[i];
    const otpCode = item.pocket_oCode;
    if (otpCode !== '') {
      const pocket_oCode = decryptData(otpCode);

      if (code === pocket_oCode) {
        user = item;
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
  const userData = {
    email: email,
    emailVerified: false,
    password: password,
    disabled: false,
  };

  if (remoteApp) {
    await getAuth(remoteApp).createUser(userData);
  }

  const userRecord = await getAuth().createUser(userData);

  const userEmail = userRecord.email;
  const link = await getAuth().generateEmailVerificationLink(userEmail);

  sendVerificationEmail(userEmail, fullname, link);

  const data = {
    about: {
      name: fullname,
      role: 'vip',
      user_uid: userEmail,
    },
  };

  const ref = await db.collection('users').add(data);
  await this.addNew(ref.id);
};

Users.prototype.delete = async function (userId, authId) {
  await db.collection('users').doc(userId).delete();

  // remove from auth if qualified
  if (remoteApp && authId) {
    await getAuth(remoteApp).deleteUser(authId);
  }

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
