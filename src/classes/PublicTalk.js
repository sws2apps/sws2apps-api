import { getFirestore } from 'firebase-admin/firestore';
import { dbFetchTalks } from '../utils/public-talks-utils.js';

const db = getFirestore(); //get default database

class PublicTalks {
	constructor() {
		this.list = [];
	}
}

PublicTalks.prototype.sort = function () {
	this.list.sort((a, b) => {
		return a.talk_number > b.talk_number ? 1 : -1;
	});
};

PublicTalks.prototype.loadAll = async function () {
	this.list = await dbFetchTalks();
	this.sort();
};

PublicTalks.prototype.isExist = function (talk_number) {
	const found = this.list.find((record) => record.talk_number === talk_number);
	return found ? true : false;
};

PublicTalks.prototype.find = function (talk_number) {
	return this.list.find((record) => record.talk_number === talk_number);
};

PublicTalks.prototype.update = async function (language, value) {
	const isTalkExist = this.isExist(value.talk_number);

	if (!isTalkExist) {
		const data = {
			talk_number: value.talk_number,
			[language]: {
				title: value.title,
				modified: value.modified,
			},
		};

		const ref = await db.collection('public_talks').add(data);
		this.list.push({ id: ref.id, ...data });
		this.sort();
	}

	if (isTalkExist) {
		const data = {
			[language]: {
				title: value.title,
				modified: value.modified,
			},
		};

		const currentTalk = this.find(value.talk_number);
		await db.collection('public_talks').doc(currentTalk.id).set(data, { merge: true });

		currentTalk[language] = { title: value.title, modified: value.modified };
	}
};

export const publicTalks = new PublicTalks();
