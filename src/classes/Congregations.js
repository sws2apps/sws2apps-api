import { getFirestore } from "firebase-admin/firestore";
import { Congregation } from "./Congregation.js";

const db = getFirestore(); //get default database

const getCongregations = async () => {
  const congRef = db.collection("congregations");
  const snapshot = await congRef.get();

  const congsList = [];

  snapshot.forEach((doc) => {
    congsList.push({ id: doc.id, username: doc.data().cong_name });
  });

  congsList.sort((a, b) => {
    return a.cong_name > b.cong_name ? 1 : -1;
  });

  const finalResult = [];

  for (let i = 0; i < congsList.length; i++) {
    const CongClass = new Congregation();
    const cong = await CongClass.loadDetails(congsList[i].id);
    finalResult.push(cong);
  }

  return finalResult;
};

class clsCongregations {
  constructor() {
    this.list = [];
  }

  loadAll = async () => {
    this.list = await getCongregations();
    return this.list;
  };

  findCongregationById = (id) => {
    return this.list.find((cong) => cong.id === id);
  };

  create = async (congInfo) => {
    const cong = await db.collection("congregations").add(congInfo);
    await this.loadAll();
    return cong;
  };

  delete = async (id) => {
    await db.collection("congregations").doc(id).delete();

    await this.loadAll();
  };
}

export const Congregations = new clsCongregations();
