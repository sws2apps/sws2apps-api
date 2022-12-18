import { getFirestore } from "firebase-admin/firestore";
import { Announcement } from "./Announcement.js";

const db = getFirestore(); //get default database

const getAnnouncements = async () => {
  const announcementRef = db.collection("announcements");
  let snapshot = await announcementRef.get();

  let announcementList = [];

  snapshot.forEach((doc) => {
    let obj = {};
    obj.id = doc.id;
    obj.expiredDate = doc.data().expiredDate;
    announcementList.push(obj);
  });

  announcementList.sort((a, b) => {
    return a.expiredDate < b.expiredDate ? 1 : -1;
  });

  const finalResult = [];

  for (let i = 0; i < announcementList.length; i++) {
    const AnnouncementClass = new Announcement();
    const announcement = await AnnouncementClass.loadDetails(announcementList[i].id);
    finalResult.push(announcement);
  }

  return finalResult;
};

class clsAnnouncements {
  constructor() {
    this.list = [];
  }

  loadAll = async () => {
    this.list = await getAnnouncements();
  };

  saveDraft = async (announcement) => {
    const { id } = announcement;
    delete announcement.id;

    if (id) {
      await db.collection("announcements").doc(id).set(announcement);
    } else {
      await db.collection("announcements").add(announcement);
    }

    const announcements = await this.loadAll();
    return announcements;
  };

  publish = async (announcement) => {
    const { id } = announcement;

    if (id) {
      await db.collection("announcements").doc(id).set(announcement);
    } else {
      await db.collection("announcements").add(announcement);
    }

    const announcements = await this.loadAll();
    return announcements;
  };

  findById = (id) => {
    const found = this.list.find((announcement) => announcement.id === id);
    return { ...found };
  };

  delete = async (id) => {
    const announcementRef = db.collection("announcements").doc(id);
    const announcementSnap = await announcementRef.get();

    if (announcementSnap.exists) {
      await announcementRef.delete();
    }

    const newList = this.list.filter((announcement) => announcement.id !== id);
    this.list = newList;
    return newList;
  };
}

export const Announcements = new clsAnnouncements();
