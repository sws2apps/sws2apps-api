import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as OTPAuth from "otpauth";
import randomstring from "randomstring";
import { decryptData, encryptData } from "../utils/encryption-utils.js";
import { sendUserResetPassword } from "../utils/sendEmail.js";
import { Congregations } from "./Congregations.js";
import { Users } from "./Users.js";

const db = getFirestore(); //get default database

export class User {
  id;
  user_uid = "";
  pocket_local_id = "";
  pocket_devices = [];
  pocket_oCode = "";
  pocket_role = [];
  pocket_members = [];
  cong_id = "";
  cong_name = "";
  cong_number = "";
  mfaEnabled = false;
  username = "";
  global_role = "";
  sessions = [];
  last_seen;
  auth_uid = "";
  emailVerified = false;
  disabled = true;
  secret = "";

  constructor() {}

  loadDetails = async (id) => {
    const userRef = db.collection("users").doc(id);
    const userSnap = await userRef.get();

    const user = new User();
    user.id = id;
    user.username = userSnap.data().about.name;
    user.user_uid = userSnap.data().about?.user_uid?.toLowerCase() || "";
    user.secret = userSnap.data().about?.secret || "";
    user.sessions = userSnap.data().about?.sessions || [];
    user.global_role = userSnap.data().about.role;
    user.mfaEnabled = userSnap.data().about?.mfaEnabled || false;
    user.cong_id = userSnap.data().congregation?.id || "";
    user.cong_role = userSnap.data().congregation?.role || [];

    if (user.global_role === "pocket") {
      user.pocket_local_id = userSnap.data().congregation?.local_id || "";
      user.pocket_devices = userSnap.data().congregation?.devices || [];
      user.pocket_oCode = userSnap.data().congregation?.oCode || "";
      user.pocket_role = userSnap.data().congregation?.pocket_role || [];
      user.pocket_members = userSnap.data().congregation?.pocket_members || [];
    } else {
      const userRecord = await getAuth().getUserByEmail(user.user_uid);
      user.auth_uid = userRecord.uid;
      user.emailVerified = userRecord.emailVerified;
      user.disabled = userRecord.disabled;
    }

    if (user.cong_id.length > 0) {
      const congRef = db.collection("congregations").doc(user.cong_id);
      const docSnap = await congRef.get();
      user.cong_name = docSnap.data().cong_name || "";
      user.cong_number = docSnap.data().cong_number || "";
    }

    let lastSeens = user.sessions.map((session) => {
      return { last_seen: session.sws_last_seen };
    });

    lastSeens.sort((a, b) => {
      return a.last_seen > b.last_seen ? -1 : 1;
    });

    user.last_seen = lastSeens[0]?.last_seen || undefined;

    return user;
  };

  updateFullname = async (value) => {
    try {
      await db.collection("users").doc(this.id).update({ "about.name": value });
      this.username = value;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  updatePocketMembers = async (members) => {
    try {
      await db.collection("users").doc(this.id).update({ "congregation.pocket_members": members });
      this.pocket_members = members;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  updatePassword = async (value) => {
    try {
      await getAuth().updateUser(this.auth_uid, { password: value });
    } catch (error) {
      throw new Error(error.message);
    }
  };

  getActiveSessions = () => {
    const result = this.sessions.map((session) => {
      let obj = {
        visitorid: session.visitorid,
        ip: session.visitor_details.ip,
        country_name: session.visitor_details.ipLocation.country.name,
        device: {
          browserName: session.visitor_details.browserDetails.browserName,
          os: session.visitor_details.browserDetails.os,
          osVersion: session.visitor_details.browserDetails.osVersion,
        },
        last_seen: session.sws_last_seen,
      };

      return obj;
    });

    return result;
  };

  revokeSession = async (visitorID) => {
    try {
      const newSessions = this.sessions.filter((session) => session.visitorid !== visitorID);

      await db.collection("users").doc(this.id).update({ "about.sessions": newSessions });

      this.sessions = newSessions;
      return this.getUserActiveSession();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  removeExpiredSession = async () => {
    try {
      const currentDate = new Date().getTime();
      let validSessions = this.sessions.filter((session) => session.expires > currentDate);

      await db.collection("users").doc(this.id).update({ "about.sessions": validSessions });

      this.sessions = validSessions;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  updateSessions = async (sessions) => {
    try {
      await db.collection("users").doc(this.id).update({ "about.sessions": sessions });

      this.sessions = sessions;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  enableMFA = async () => {
    try {
      await db.collection("users").doc(this.id).update({ "about.mfaEnabled": true });

      this.mfaEnabled = true;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  logout = async (visitorID) => {
    try {
      await this.revokeSession(visitorID);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  adminLogout = async () => {
    await db.collection("users").doc(this.id).update({ "about.sessions": [] });
    this.sessions = [];
  };

  generateSecret = async () => {
    try {
      const tempSecret = new OTPAuth.Secret().base32;

      const totp = new OTPAuth.TOTP({
        issuer: "sws2apps",
        label: this.user_uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(tempSecret),
      });

      const secret = {
        secret: tempSecret,
        uri: totp.toString(),
        version: 2,
      };

      const encryptedData = encryptData(secret);

      // save secret
      await db.collection("users").doc(this.id).update({ "about.secret": encryptedData });

      this.secret = encryptedData;
      return secret;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  generatePocketCode = async () => {
    try {
      const code = randomstring.generate(10).toUpperCase();
      const secureCode = encryptData(code);

      await db.collection("users").doc(this.id).update({
        "congregation.oCode": secureCode,
      });

      this.pocket_oCode = secureCode;

      return code;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  decryptSecret = () => {
    try {
      const decryptedData = decryptData(this.secret);
      const secret = JSON.parse(decryptedData);
      return { ...secret, version: secret.version || 1 };
    } catch (error) {
      throw new Error(error.message);
    }
  };

  updatePocketDevices = async (devices) => {
    try {
      await db.collection("users").doc(this.id).update({
        "congregation.oCode": FieldValue.delete(),
        "congregation.devices": devices,
      });

      this.pocket_oCode = "";
      this.pocket_devices = devices;

      return this;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  removePocketDevice = async (devices) => {
    await db.collection("users").doc(this.id).update({
      "congregation.devices": devices,
    });

    this.pocket_devices = devices;
  };

  removeCongregation = async () => {
    try {
      await db.collection("users").doc(this.id).update({ congregation: FieldValue.delete() });

      this.cong_id = "";
      this.cong_name = "";
      this.cong_number = "";
    } catch (error) {
      throw new Error(error.message);
    }
  };

  assignCongregation = async (congInfo) => {
    try {
      await db.collection("users").doc(this.id).set(congInfo, { merge: true });
      await this.loadDetails(id);
      await Congregations.loadAll();
    } catch (err) {
      throw new Error(err.message);
    }
  };

  enable = async () => {
    if (this.global_role === "pocket") {
      await db.collection("users").doc(this.id).update({ "about.pocket_disabled": false });
    } else {
      await getAuth().updateUser(this.auth_uid, { disabled: false });
      this.disabled = false;
    }
  };

  disable = async () => {
    if (this.global_role === "pocket") {
      await db.collection("users").doc(this.id).update({ "about.pocket_disabled": true });
    } else {
      await getAuth().updateUser(this.auth_uid, { disabled: true });
      this.disabled = true;
    }
  };

  resetPassword = async () => {
    const resetLink = await getAuth().generatePasswordResetLink(this.user_uid);
    sendUserResetPassword(this.user_uid, user.username, resetLink);
  };

  revokeToken = async () => {
    // generate new secret and encrypt
    const tempSecret = new OTPAuth.Secret().base32;

    const totp = new OTPAuth.TOTP({
      issuer: "sws2apps",
      label: this.user_uid,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(tempSecret),
    });

    const secret = {
      secret: tempSecret,
      uri: totp.toString(),
      version: 2,
    };

    const encryptedData = encryptData(secret);

    // remove all sessions and save new secret
    const data = {
      "about.mfaEnabled": false,
      "about.secret": encryptedData,
      "about.sessions": [],
    };
    await db.collection("users").doc(this.id).update(data);

    await this.loadDetails();
  };

  makeAdmin = async () => {
    await db.collection("users").doc(this.id).update({ "about.role": "admin" });
    this.global_role = "admin";
  };

  resendVerificationEmail = async () => {
    const link = await getAuth().generateEmailVerificationLink(this.user_uid);
    sendVerificationEmail(this.user_uid, this.username, link);
  };

  updatePocketDevicesInfo = async (visitorId) => {
    const foundDevice = this.pocket_devices.find((device) => device.visitorid === visitorId);
    const filteredDevices = this.pocket_devices.filter((device) => device.visitorid !== visitorId);

    const updatedDevices = [
      {
        visitorId,
        name: foundDevice.name,
        sws_last_seen: new Date().getTime(),
      },
      ...filteredDevices,
    ];

    await db.collection("users").doc(this.id).update({ "congregation.devices": updatedDevices });

    await this.loadDetails();

    await Congregations.loadAll();
  };

  updateSessionsInfo = async (visitorId) => {
    let newSessions = this.sessions.map((session) => {
      if (session.visitorid === visitorId) {
        return { ...session, sws_last_seen: new Date().getTime() };
      } else {
        return session;
      }
    });

    await db.collection("users").doc(this.id).update({ "about.sessions": newSessions });

    this.sessions = newSessions;

    await Users.loadAll();
    await Congregations.loadAll();
  };
}
