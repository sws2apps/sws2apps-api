import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export class Country {
	constructor(id) {
		this.id = id;
		this.code = '';
		this.name = {};
		this.congregations = [];
	}
}

Country.prototype.sortCongregations = function () {
	this.congregations.sort((a, b) => {
		return a.name?.E > b.name?.E ? 1 : -1;
	});
};

Country.prototype.loadDetails = async function () {
	const countryRef = db.collection('countries').doc(this.id);
	const countrySnap = await countryRef.get();

	this.code = countrySnap.data().code;
	this.name = countrySnap.data().name;
	this.congregations = countrySnap.data().congregations || [];
	this.sortCongregations();
};

Country.prototype.update = async function (countryInfo, language) {
	const data = {
		code: countryInfo.code,
		name: {
			...this.name,
			[language]: countryInfo.name,
		},
	};
	await db.collection('countries').doc(this.id).set(data);

	this.code = countryInfo.code;
	this.name = data.name;
};

Country.prototype.findCongregationByNumber = function (number) {
	return this.congregations.find((congregation) => congregation.number === number);
};

Country.prototype.addCongregation = async function (congInfo, language) {
	const newData = {
		id: crypto.randomUUID(),
		number: congInfo.number,
		name: {
			E: congInfo.name,
		},
	};

	if (language === 'E') newData.language = congInfo.language;

	this.congregations.push(newData);
	const data = { congregations: this.congregations };

	await db.collection('countries').doc(this.id).set(data, { merge: true });
	this.sortCongregations();
};

Country.prototype.updateCongregation = async function (congInfo, language) {
	const cong = this.congregations.find((congregation) => congregation.number === congInfo.number);
	cong.name[language] = congInfo.name;
	if (language === 'E') cong.language = congInfo.language;

	const data = { congregations: this.congregations };

	await db.collection('countries').doc(this.id).set(data, { merge: true });
	this.sortCongregations();
};

Country.prototype.makeCongregationActive = async function (id) {
	const cong = this.congregations.find((congregation) => congregation.id === id);
	cong.active = true;

	const data = { congregations: this.congregations };

	await db.collection('countries').doc(this.id).set(data, { merge: true });
};

Country.prototype.makeCongregationInactive = async function (id) {
	const cong = this.congregations.find((congregation) => congregation.id === id);
	delete cong.active;

	const data = { congregations: this.congregations };

	await db.collection('countries').doc(this.id).set(data, { merge: true });
};
