import { getFirestore } from "firebase-admin/firestore";
import CongregationRequest from "../classes/CongregationRequest.js";

const db = getFirestore();

export const dbFetchRequestsCongregation = async () => {
  const congRef = db.collection("congregation_request");
  const snapshot = await congRef.get();

  const items = [];

  snapshot.forEach((doc) => {
    if (doc.data().request_open) {
      items.push(doc.id);
    }
  });

  let finalResult = [];
  for (let i = 0; i < items.length; i++) {
    const RequestClass = new CongregationRequest(items[i]);
    const request = await RequestClass.loadDetails();
    finalResult.push(request);
  }

  return finalResult;
};
