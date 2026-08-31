import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export type DocumentStoreRecord = {
	id: string;
	data: Record<string, unknown>;
};

export const getCollectionRecords = async (
	collectionName: string,
): Promise<DocumentStoreRecord[]> => {
	const database = getFirestore(getApp());
	const snapshot = await database.collection(collectionName).get();

	return snapshot.docs.map((document) => ({
		id: document.id,
		data: document.data(),
	}));
};

export const getFirstCollectionRecord = async (
	collectionName: string,
): Promise<DocumentStoreRecord | undefined> => {
	const database = getFirestore(getApp());
	const snapshot = await database.collection(collectionName).limit(1).get();
	const document = snapshot.docs[0];

	if (!document) return undefined;

	return {
		id: document.id,
		data: document.data(),
	};
};

export const addCollectionRecord = async (
	collectionName: string,
	data: Record<string, unknown>,
): Promise<void> => {
	const database = getFirestore(getApp());
	await database.collection(collectionName).add(data);
};

export const updateCollectionRecord = async (
	collectionName: string,
	documentId: string,
	data: Record<string, unknown>,
): Promise<void> => {
	const database = getFirestore(getApp());
	await database.collection(collectionName).doc(documentId).update(data);
};
