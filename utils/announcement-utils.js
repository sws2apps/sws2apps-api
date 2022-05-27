// dependency
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

export const getAnnouncements = async () => {
	const announcementRef = db.collection('announcements');
	let snapshot = await announcementRef.get();

	let announcementList = [];

	snapshot.forEach((doc) => {
		const { E, appTarget, publishedDate, expiredDate, isDraft } = doc.data();

		let obj = {};
		obj.id = doc.id;
		obj.title = E.title;
		obj.desc = E.desc;
		obj.appTarget = appTarget;
		obj.publishedDate = publishedDate;
		obj.expiredDate = expiredDate;
		obj.isDraft = isDraft;
		announcementList.push(obj);
	});

	announcementList.sort((a, b) => {
		return a.expiredDate < b.expiredDate ? 1 : -1;
	});

	return announcementList;
};

export const saveDraftAnnouncement = async (announcement) => {
	const { id } = announcement;
	delete announcement.id;

	if (id) {
		await db.collection('announcements').doc(id).set(announcement);
	} else {
		await db.collection('announcements').add(announcement);
	}

	const announcements = await getAnnouncements();
	return announcements;
};

export const getAnnouncement = async (id) => {
	const announcementRef = db.collection('announcements').doc(id);
	const announcementSnap = await announcementRef.get();

	if (announcementSnap.exists) {
		return announcementSnap.data();
	} else {
		return;
	}
};

export const deleteAnnouncement = async (id) => {
	const announcementRef = db.collection('announcements').doc(id);
	const announcementSnap = await announcementRef.get();

	if (announcementSnap.exists) {
		await announcementRef.delete();
	}

	const announcements = await getAnnouncements();
	return announcements;
};

export const publishAnnouncement = async (announcement) => {
	const { id } = announcement;

	await db.collection('announcements').doc(id).set(announcement);

	const announcements = await getAnnouncements();
	return announcements;
};

export const getAnnouncementsClient = async () => {
	const announcementRef = db.collection('announcements');
	let snapshot = await announcementRef.get();

	let announcementList = [];

	snapshot.forEach((doc) => {
		const { E, MG, appTarget, publishedDate, expiredDate, isDraft } =
			doc.data();

		if (!isDraft) {
			let obj = {};
			obj.id = doc.id;
			obj.E = E;
			obj.MG = MG;
			obj.appTarget = appTarget;
			obj.publishedDate = publishedDate;
			obj.expiredDate = expiredDate;
			announcementList.push(obj);
		}
	});

	announcementList.sort((a, b) => {
		return a.expiredDate < b.expiredDate ? 1 : -1;
	});

	return announcementList;
};
