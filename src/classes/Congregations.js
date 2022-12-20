import { getFirestore } from "firebase-admin/firestore";
import { dbFetchCongregations } from "../utils/congregation-utils.js";
import { Congregation } from "./Congregation.js";

const db = getFirestore(); //get default database

class Congregations {
  constructor() {
    this.list = [];
  }
}

Congregations.prototype.sort = function () {
  this.list.sort((a, b) => {
    return a.cong_name > b.cong_name ? 1 : -1;
  });
};

Congregations.prototype.loadAll = async function () {
  this.list = await dbFetchCongregations();
  this.sort();
  return this.list;
};

Congregations.prototype.findCongregationById = function (id) {
  return this.list.find((cong) => cong.id === id);
};

Congregations.prototype.create = async function (congInfo) {
  const cong = await db.collection("congregations").add(congInfo);

  const NewCong = new Congregation(cong.id);
  const newCong = await NewCong.loadDetails();
  this.list.push(newCong);
  this.sort();

  return cong;
};

Congregations.prototype.delete = async function (id) {
  await db.collection("congregations").doc(id).delete();

  this.list = this.list.filter((cong) => cong.id !== id);
};

export const congregations = new Congregations();
