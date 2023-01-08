import { getFirestore } from 'firebase-admin/firestore';
import { dbFetchCongregations } from '../utils/congregation-utils.js';
import { Congregation } from './Congregation.js';

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

Congregations.prototype.findByNumber = function (number) {
	const regex = new RegExp('\\d+');

	const array = regex.exec(number);
	const cong_country = number.substring(0, array.index);
	const cong_number = array[0];

	return this.list.find((cong) => cong.country_code === cong_country && cong.cong_number === cong_number);
};

Congregations.prototype.create = async function (congInfo) {
	congInfo.cong_number = congInfo.cong_number.toString();
	const cong = await db.collection('congregations').add(congInfo);

	const newCong = new Congregation(cong.id);
	await newCong.loadDetails();
	this.list.push(newCong);
	this.sort();

	return newCong;
};

Congregations.prototype.delete = async function (id) {
	await db.collection('congregations').doc(id).delete();

	this.list = this.list.filter((cong) => cong.id !== id);
};

export const congregations = new Congregations();
