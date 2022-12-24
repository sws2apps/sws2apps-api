import { getFirestore } from 'firebase-admin/firestore';
import { dbFetchRequestsCongregation } from '../utils/congregation-request-utils.js';
import CongregationRequest from './CongregationRequest.js';

// get firestore
const db = getFirestore(); //get default database

class CongregationRequests {
  constructor() {
    this.list = [];
  }
}

CongregationRequests.prototype.sort = function () {
  this.list.sort((a, b) => {
    return a.request_date > b.request_date ? 1 : -1;
  });
};

CongregationRequests.prototype.loadAll = async function () {
  this.list = await dbFetchRequestsCongregation();
  this.sort();
};

CongregationRequests.prototype.findRequestByEmail = function (email) {
  const found = this.list.find((request) => request.email === email);
  return found;
};

CongregationRequests.prototype.findRequestById = function (id) {
  const found = this.list.find((request) => request.id === id);
  return found;
};

CongregationRequests.prototype.create = async function (data) {
  try {
    const reqRef = await db.collection('congregation_request').add(data);

    const requestCong = new CongregationRequest(reqRef.id);
    await requestCong.loadDetails();

    this.list.push(requestCong);
    this.sort();

    return requestCong;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const congregationRequests = new CongregationRequests();
