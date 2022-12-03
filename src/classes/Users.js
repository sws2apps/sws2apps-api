import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { decryptData } from "../utils/encryption-utils.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";
import { User } from "./User.js";

const db = getFirestore(); //get default database

const getUsers = async () => {
  const userRef = db.collection("users");
  const snapshot = await userRef.get();

  const tmpUsers = [];

  snapshot.forEach((doc) => {
    tmpUsers.push({ id: doc.id, username: doc.data().about.name });
  });

  tmpUsers.sort((a, b) => {
    return a.username > b.username ? 1 : -1;
  });

  const finalResult = [];

  for (let i = 0; i < tmpUsers.length; i++) {
    const UserClass = new User();
    const user = await UserClass.loadDetails(tmpUsers[i].id);
    finalResult.push(user);
  }

  return finalResult;
};

class clsUsers {
  list = [];

  constructor() {}

  loadAll = async () => {
    this.list = await getUsers();
  };

  findUserByEmail = (email) => {
    const found = this.list.find((user) => user.user_uid === email);
    return found;
  };

  findUserById = (id) => {
    const found = this.list.find((user) => user.id === id);
    return found;
  };

  findUserByOTPCode = (code) => {
    try {
      let user;
      for (let i = 0; i < this.list.length; i++) {
        const item = this.list[i];
        const otpCode = item.pocket_oCode;

        const pocket_oCode = decryptData(otpCode);

        if (code === pocket_oCode) {
          user = item;
          break;
        }
      }

      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  findPocketUser = (pocketId) => {
    const found = this.list.find((user) => user.pocket_local_id === pocketId);
    return found;
  };

  findPocketByVisitorId = async (visitorId) => {
    const users = this.list;

    let user;

    for (let i = 0; i < users.length; i++) {
      const devices = users[i].pocket_devices || [];
      const found = devices.find((device) => device.visitorid === visitorId);

      if (found) {
        user = users[i];
        break;
      }
    }

    return user;
  };

  create = async (fullname, email, password) => {
    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: false,
      password: password,
      disabled: false,
    });

    const userEmail = userRecord.email;
    const link = await getAuth().generateEmailVerificationLink(userEmail);

    sendVerificationEmail(userEmail, fullname, link);

    const data = {
      about: {
        name: fullname,
        role: "vip",
        user_uid: userEmail,
      },
    };

    await db.collection("users").add(data);

    await this.loadAll();
  };

  delete = async (userId, authId) => {
    await db.collection("users").doc(userId).delete();

    // remove from auth if qualified
    if (authId) await getAuth().deleteUser(authId);
  };
}

export const Users = new clsUsers();
