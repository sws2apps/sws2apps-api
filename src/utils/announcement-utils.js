import { getFirestore } from 'firebase-admin/firestore';
import { Announcement } from '../classes/Announcement.js';
import { projectsGroupsApi, sourceStringsApi, stringTranslationsApi } from '../config/crowdin-config.js';

const db = getFirestore();

export const dbFetchAnnouncements = async () => {
	const dbRef = db.collection('announcements');
	let dbSnap = await dbRef.get();

	const items = [];

	dbSnap.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult = [];

	for (let i = 0; i < items.length; i++) {
		const announcement = new Announcement(items[i]);
		await announcement.loadDetails();
		finalResult.push(announcement);
	}

	return finalResult;
};

export const fetchCrowdinAnnouncements = async (app) => {
	const isDev = process.env.NODE_ENV === 'development';

	const projects = (await projectsGroupsApi.listProjects()).data;
	const project = projects.find((project) => project.data.identifier === process.env.CROWDIN_PROJECT_NAME).data;
	const targetLanguages = project.targetLanguages;

	const sourceStrings = (await sourceStringsApi.listProjectStrings(project.id)).data;

	const finalResult = [];

	for await (const { data: source } of sourceStrings) {
		const appTarget = source.identifier.split('-')[0];
		if (appTarget === app) {
			if (source.identifier.indexOf('-title') !== -1) {
				const dateCreated = new Date(source.createdAt);
				const validDate = dateCreated.setHours(dateCreated.getHours() + 1);
				const validDateISO = new Date(validDate).toISOString();
				const checkDateISO = new Date().toISOString();

				if (validDateISO < checkDateISO || isDev) {
					const bodyFilter = source.identifier.replace('-title', '-body');
					const bodySource = sourceStrings.find((item) => item.data.identifier === bodyFilter);

					if (bodySource) {
						const obj = { id: source.id, appTarget };
						const sourceTitleModified = source.updatedAt === null ? source.createdAt : source.updatedAt;
						const sourceTitleModifiedISO = new Date(sourceTitleModified).toISOString();

						const sourceBodyModified = bodySource.data.updatedAt === null ? bodySource.data.createdAt : bodySource.data.updatedAt;
						const sourceBodyModifiedISO = new Date(sourceBodyModified).toISOString();

						obj.title = [];
						obj.title.push({ language: 'en', text: source.text, modifiedAt: sourceTitleModifiedISO });
						obj.body = [];
						obj.body.push({ language: 'en', text: bodySource.data.text, modifiedAt: sourceBodyModifiedISO });

						for await (const language of targetLanguages) {
							const targetTitleObj = {};
							const targetBodyObj = {};

							targetTitleObj.language = language.locale;
							targetTitleObj.text = source.text;
							targetTitleObj.modifiedAt = sourceTitleModifiedISO;

							targetBodyObj.language = language.locale;
							targetBodyObj.text = bodySource.data.text;
							targetBodyObj.modifiedAt = sourceBodyModifiedISO;

							const translationTitleInfo = (
								await stringTranslationsApi.listTranslationApprovals(project.id, {
									stringId: source.id,
									languageId: language.id,
								})
							).data;

							if (translationTitleInfo.length > 0) {
								const target = (await stringTranslationsApi.listStringTranslations(project.id, source.id, language.id)).data[0]
									.data;

								console.log(target.updatedAt);
								const targetTitleModified = target.updatedAt || target.createdAt;
								const targetTitleModifiedISO = new Date(targetTitleModified).toISOString();

								targetTitleObj.text = target.text;
								targetTitleObj.modifiedAt = targetTitleModifiedISO;
							}

							obj.title.push(targetTitleObj);

							const translationBodyInfo = (
								await stringTranslationsApi.listTranslationApprovals(project.id, {
									stringId: bodySource.data.id,
									languageId: language.id,
								})
							).data;

							if (translationBodyInfo.length > 0) {
								const target = (await stringTranslationsApi.listStringTranslations(project.id, bodySource.data.id, language.id))
									.data[0].data;
								const targetBodyModified = target.updatedAt || target.createdAt;
								const targetBodyModifiedISO = new Date(targetBodyModified).toISOString();

								targetBodyObj.text = target.text;
								targetBodyObj.modifiedAt = targetBodyModifiedISO;
							}

							obj.body.push(targetBodyObj);
						}

						finalResult.push(obj);
					}
				}
			}
		}
	}

	return finalResult;
};
