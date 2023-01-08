import { getFirestore } from 'firebase-admin/firestore';
import { Announcement } from './Announcement.js';
import { dbFetchAnnouncements } from '../utils/announcement-utils.js';

const db = getFirestore(); //get default database

class Announcements {
	constructor() {
		this.list = [];
	}
}

Announcements.prototype.sort = function () {
	this.list.sort((a, b) => {
		return a.expiredDate < b.expiredDate ? 1 : -1;
	});
};

Announcements.prototype.update = function (id, newValue) {
	const findItem = this.list.find((announcement) => announcement.id === id);

	for (const [key] of Object.entries(findItem)) {
		findItem[key] = newValue[key];
	}
};

Announcements.prototype.addNew = async function (id) {
	const NewClass = new Announcement(id);
	const newItem = await NewClass.loadDetails();
	this.list.push(newItem);
	this.sort();
};

Announcements.prototype.loadAll = async function () {
	this.list = await dbFetchAnnouncements();
	this.sort();
};

Announcements.prototype.saveDraft = async function (announcement) {
	const { id } = announcement;
	delete announcement.id;

	announcement.isDraft = true;

	if (id) {
		await db.collection('announcements').doc(id).set(announcement);
		announcement.id = id;
		await this.update(id, announcement);
	} else {
		const ref = await db.collection('announcements').add(announcement);
		await this.addNew(ref.id);
	}
	console.log(this.list);
	return this.list;
};

Announcements.prototype.publish = async function (announcement) {
	const { id } = announcement;

	announcement = {
		...announcement,
		isDraft: false,
		publishedDate: new Date(),
	};

	if (id) {
		await db.collection('announcements').doc(id).set(announcement);
		await this.update(id, announcement);
	} else {
		const ref = await db.collection('announcements').add(announcement);
		await this.addNew(ref.id);
	}

	return this.list;
};

Announcements.prototype.findById = function (id) {
	const found = this.list.find((announcement) => announcement.id === id);
	return found;
};

Announcements.prototype.findByTarget = function (appTarget) {
	const found = this.list.filter((announcement) => announcement.appTarget === appTarget) || [];
	return found;
};

Announcements.prototype.delete = async function (id) {
	const announcementRef = db.collection('announcements').doc(id);
	const announcementSnap = await announcementRef.get();

	if (announcementSnap.exists) {
		await announcementRef.delete();
	}

	this.list = this.list.filter((announcement) => announcement.id !== id);

	return this.list;
};

export const announcements = new Announcements();
