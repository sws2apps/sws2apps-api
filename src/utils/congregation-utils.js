import { getFirestore } from "firebase-admin/firestore";
import { Congregation } from "../classes/Congregation.js";

const db = getFirestore(); //get default database

export const dbFetchCongregations = async () => {
  const congRef = db.collection("congregations");
  const snapshot = await congRef.get();

  const items = [];

  snapshot.forEach((doc) => {
    items.push(doc.id);
  });

  const finalResult = [];

  for (let i = 0; i < items.length; i++) {
    const CongClass = new Congregation(items[i]);
    const cong = await CongClass.loadDetails();
    finalResult.push(cong);
  }

  return finalResult;
};
