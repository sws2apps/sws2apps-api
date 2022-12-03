import { getFirestore } from "firebase-admin/firestore";
import { Users } from "./Users.js";

// get firestore
const db = getFirestore(); //get default database

const getCongregationsRequests = async () => {
  const congRef = db.collection("congregation_request");
  const snapshot = await congRef.get();

  let requests = [];

  snapshot.forEach((doc) => {
    if (doc.data().request_open) {
      let obj = { id: doc.id, request_date: doc.data().request_date };
      requests.push(obj);
    }
  });

  requests.sort((a, b) => {
    return a.request_date > b.request_date ? 1 : -1;
  });

  let finalResult = [];
  for (let i = 0; i < requests.length; i++) {
    const RequestClass = new CongregationRequest();
    const request = await RequestClass.loadDetails(requests[i].id);
    finalResult.push(request);
  }

  return finalResult;
};

class clsCongregationRequests {
  list = [];

  constructor() {}

  loadAll = async () => {
    this.list = await getCongregationsRequests();
  };

  findRequestByEmail = async (email) => {
    return this.list.find((request) => request.email === email);
  };

  findRequestById = async (id) => {
    return this.list.find((request) => request.id === id);
  };

  createAccount = async (data) => {
    try {
      const reqRef = await db.collection("congregation_request").add(data);

      const ReqClass = new CongregationRequest();
      const request = await ReqClass.loadDetails(reqRef.id);

      this.list.push(request);

      this.list.sort((a, b) => {
        return a.request_date > b.request_date ? 1 : -1;
      });
    } catch (error) {
      throw new Error(error.message);
    }
  };
}

export const CongregationRequests = new clsCongregationRequests();

class CongregationRequest {
  id;
  cong_name = "";
  cong_number = "";
  email = "";
  username = "";
  user_id = "";
  cong_role = [];
  approved = false;
  request_date;
  request_open = true;

  constructor() {}

  loadDetails = async (id) => {
    const requestRef = db.collection("congregation_request").doc(id);
    const requestSnap = await requestRef.get();

    const request = new CongregationRequest();

    const user = await Users.findUserByEmail(requestSnap.data().email);

    request.id = id;
    request.cong_name = requestSnap.data().cong_name;
    request.cong_number = requestSnap.data().cong_number;
    request.email = user.user_uid;
    request.username = user.username;
    request.user_id = user.id;
    request.cong_role = ["admin", requestSnap.data().cong_role];
    request.approved = requestSnap.data().approved;
    request.request_date = requestSnap.data().request_date;
    request.request_open = requestSnap.data().request_open;

    return request;
  };

  approve = async () => {
    const requestData = { approved: true, request_open: false };
    await db.collection("congregation_request").doc(this.id).set(requestData, { merge: true });

    await CongregationRequests.loadAll();
  };

  disapprove = async () => {
    const requestData = { approved: false, request_open: false };
    await db.collection("congregation_request").doc(this.id).set(requestData, { merge: true });

    await CongregationRequests.loadAll();
  };
}
