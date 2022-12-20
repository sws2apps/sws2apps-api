import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(); //get default database

export class Announcement {
  constructor(id) {
    this.id = id;
    this.data = [];
    this.appTarget = "";
    this.expiredDate = "";
    this.isDraft = true;
    this.publishedDate = "";
  }
}

Announcement.prototype.loadDetails = async function () {
  const dbRef = db.collection("announcements").doc(this.id);
  const dbSnap = await dbRef.get();

  const dbItem = dbSnap.data();

  this.data = dbItem.data;
  this.appTarget = dbItem.appTarget;
  this.expiredDate = dbItem.expiredDate;
  this.isDraft = dbItem.isDraft;
  this.publishedDate = dbItem.publishedDate;

  return this;
};
