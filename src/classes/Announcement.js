import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(); //get default database

export class Announcement {
  id;
  data;
  appTarget;
  expiredDate;
  isDraft;
  publishedDate;

  constructor() {}

  loadDetails = async (id) => {
    const announcementRef = db.collection('announcements').doc(id);
    const announcementSnap = await announcementRef.get();

    const dbItem = announcementSnap.data();

    const announcement = new Announcement();
    announcement.id = id;
    announcement.data = dbItem.data;
    announcement.appTarget = dbItem.appTarget;
    announcement.expiredDate = dbItem.expiredDate;
    announcement.isDraft = dbItem.isDraft;
    announcement.publishedDate = dbItem.publishedDate;

    return announcement;
  };
}
