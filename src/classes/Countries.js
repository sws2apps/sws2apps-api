import { getFirestore } from 'firebase-admin/firestore';
import { Country } from './Country.js';
import { dbFetchCountries } from '../utils/country-util.js';

const db = getFirestore(); //get default database

export class Countries {
	constructor() {
		this.list = [];
	}
}

Countries.prototype.sort = function () {
	this.list.sort((a, b) => {
		return a.name?.E > b.name?.E ? 1 : -1;
	});
};

Countries.prototype.loadAll = async function () {
	this.list = await dbFetchCountries();
	this.sort();
	return this.list;
};

Countries.prototype.add = async function (countryInfo, language) {
	const data = {
		code: countryInfo.code,
		name: {
			[language]: countryInfo.name,
		},
	};

	const country = await db.collection('countries').add(data);

	const newCountry = new Country(country.id);
	await newCountry.loadDetails();
	this.list.push(newCountry);
	this.sort();

	return newCountry;
};

Countries.prototype.findByCountryCode = function (code) {
	return this.list.find((country) => country.code === code);
};

Countries.prototype.findById = function (id) {
	return this.list.find((country) => country.id === id);
};

export const countries = new Countries();
