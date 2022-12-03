import { FieldValue, getFirestore } from "firebase-admin/firestore";
import randomstring from "randomstring";
import { decryptData, encryptData } from "../utils/encryption-utils.js";
import { Users } from "./Users.js";

const db = getFirestore(); //get default database

export class Congregation {
  id;
  cong_name = "";
  cong_number = "";
  cong_persons = "";
  cong_members = [];
  cong_sourceMaterial = [];
  cong_schedule = [];
  cong_sourceMaterial_draft = [];
  cong_schedule_draft = [];
  cong_swsPocket = [];
  cong_settings;
  last_backup = {};

  constructor() {}

  loadDetails = async (id) => {
    const congRef = db.collection("congregations").doc(id);
    const congSnap = await congRef.get();

    const cong = new Congregation();

    cong.id = id;
    cong.cong_name = congSnap.data().cong_name;
    cong.cong_number = congSnap.data().cong_number;
    cong.last_backup = congSnap.data().last_backup;
    cong.cong_persons = congSnap.data().cong_persons || "";
    cong.cong_sourceMaterial = congSnap.data().cong_sourceMaterial || [];
    cong.cong_schedule = congSnap.data().cong_schedule || [];
    cong.cong_sourceMaterial_draft = congSnap.data().cong_sourceMaterial_draft || [];
    cong.cong_schedule_draft = congSnap.data().cong_schedule_draft || [];
    cong.cong_swsPocket = congSnap.data().cong_swsPocket || [];
    cong.cong_settings = congSnap.data().cong_settings || [];
    cong.members = [];

    const usersList = Users.list;
    for (let a = 0; a < usersList.length; a++) {
      if (usersList[a].global_role === "vip" && usersList[a].cong_id === id) {
        cong.cong_members.push({
          id: usersList[a].id,
          user_uid: usersList[a].user_uid,
          name: usersList[a].username,
          role: usersList[a].cong_role,
          global_role: usersList[a].global_role,
          last_seen: usersList[a].last_seen,
        });
      }
    }

    if (congSnap.data().last_backup) {
      const fDate = Date.parse(congSnap.data().last_backup.date.toDate().toString());
      cong.last_backup.date = fDate;

      const user = await Users.findUserById(congSnap.data().last_backup.by);
      cong.last_backup.by = user.username;
    }

    return cong;
  };

  isMember = (email) => {
    const user = Users.findUserByEmail(email);
    return user.cong_id === this.id;
  };

  saveBackup = async (cong_persons, cong_schedule, cong_sourceMaterial, cong_swsPocket, cong_settings, email) => {
    try {
      // encrypt cong_persons data
      const encryptedPersons = encryptData(cong_persons);

      const userInfo = Users.findUserByEmail(email);

      const data = {
        cong_persons: encryptedPersons,
        cong_schedule_draft: cong_schedule,
        cong_sourceMaterial_draft: cong_sourceMaterial,
        cong_swsPocket: cong_swsPocket,
        cong_settings: cong_settings,
        last_backup: {
          by: userInfo.id,
          date: new Date(),
        },
      };

      await db.collection("congregations").doc(this.id).set(data, { merge: true });

      this.cong_persons = encryptedPersons;
      this.cong_schedule_draft = cong_schedule;
      this.cong_sourceMaterial_draft = cong_sourceMaterial;
      this.cong_swsPocket = cong_swsPocket;
      this.cong_settings = cong_settings;
      this.last_backup = data.last_backup;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  retrieveBackup = () => {
    try {
      // decrypt cong_persons data
      const decryptedPersons = JSON.parse(decryptData(this.cong_persons));

      const obj = {
        cong_persons: decryptedPersons,
        cong_schedule: this.cong_schedule_draft,
        cong_sourceMaterial: this.cong_sourceMaterial_draft,
        cong_swsPocket: this.cong_swsPocket,
        cong_settings: this.cong_settings,
      };

      return obj;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  removeUser = async (userId) => {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ congregation: FieldValue.delete() });

    await this.loadDetails();
  };

  addUser = async (userId) => {
    const data = {
      congregation: {
        id: this.id,
        role: [],
      },
    };

    await db.collection("users").doc(userId).set(data, { merge: true });

    await this.loadDetails();
  };

  updateUserRole = async (userId, userRole) => {
    const data = {
      congregation: {
        id: this.id,
        role: userRole,
      },
    };

    await db.collection("users").doc(userId).set(data, { merge: true });

    await this.loadDetails();
  };

  createPocketUser = async (pocketName, pocketId) => {
    const code = randomstring.generate(10).toUpperCase();
    const secureCode = encryptData(code);

    await db.collection("users").add({
      about: {
        name: pocketName,
        role: "pocket",
      },
      congregation: {
        id: this.id,
        local_id: pocketId,
        devices: [],
        oCode: secureCode,
        pocket_role: ["view_meeting_schedule"],
        pocket_members: [],
      },
    });

    await this.loadDetails();

    return code;
  };

  deletePocketUser = async (userId) => {
    await db.collection("users").doc(userId).delete();
  };

  sendPocketSchedule = async (cong_schedule, cong_sourceMaterial) => {
    const currentSchedule = this.cong_schedule;
    const currentSource = this.cong_sourceMaterial;

    // remove expired schedule and source (> 3 months)
    const currentDate = new Date().getTime();
    const validSchedule = currentSchedule.students.filter((schedule) => schedule.expiredDate > currentDate);
    const validSource = currentSource.students.filter((source) => source.expiredDate > currentDate);

    const { month, year } = cong_schedule;

    const lastDate = new Date(year, month + 1, 0);
    let expiredDate = new Date();
    expiredDate.setDate(lastDate.getDate() + 90);
    const expiredTime = expiredDate.getTime();

    const objSchedule = {
      ...cong_schedule,
      expiredDate: expiredTime,
      modifiedDate: new Date().getTime(),
    };
    const objSource = {
      ...cong_sourceMaterial,
      expiredDate: expiredTime,
      modifiedDate: new Date().getTime(),
    };

    let newStudentsSchedule = validSchedule.filter((schedule) => schedule.id !== objSchedule.id);
    newStudentsSchedule.push(objSchedule);

    let newStudentsSource = validSource.filter((source) => source.id !== objSource.id);
    newStudentsSource.push(objSource);

    const newSchedule = {
      ...currentSchedule,
      students: newStudentsSchedule,
    };
    const newSource = { ...currentSource, students: newStudentsSource };

    await db.collection("congregations").doc(this.id).update({
      cong_schedule: newSchedule,
      cong_sourceMaterial: newSource,
    });

    await this.loadDetails(this.id);
  };
}
