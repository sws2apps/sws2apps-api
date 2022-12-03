import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(); //get default database

export class Announcement {
  id;
  data;

  constructor() {}

  loadDetails = async (id) => {
    const announcementRef = db.collection("announcements").doc(id);
    const announcementSnap = await announcementRef.get();

    const dbItem = announcementSnap.data();

    const announcement = new Announcement();
    announcement.id = id;
    announcement.data = { ...dbItem };

    return announcement;
  };
}
