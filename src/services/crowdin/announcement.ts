import { crowdinProject, sourceStringsApi, stringTranslationsApi } from '../../config/crowdin_config.js';

type Message = { language: string; text: string; modifiedAt: string };
type Announcement = { id: number; appTarget: string; title: Message[]; body: Message[] };

const isDev = process.env.NODE_ENV === 'development';
const projectId = +process.env.CROWDIN_PROJECT_ID!;

const createMessageObject = (text: string, modifiedAt: string) => ({ language: 'en', text, modifiedAt });

const mapTargetLanguageMessages = async (source: any, bodySource: any, targetLanguages: any) => {
	const obj: Announcement = { id: source.id, appTarget: source.identifier.split('-')[0], title: [], body: [] };

	const sourceTitleModified = source.updatedAt === null ? source.createdAt : source.updatedAt;
	const sourceBodyModified = bodySource.data.updatedAt === null ? bodySource.data.createdAt : bodySource.data.updatedAt;

	const titleMessage = createMessageObject(source.text.toString(), sourceTitleModified);
	const bodyMessage = createMessageObject(bodySource.data.text.toString(), sourceBodyModified);

	obj.title.push(titleMessage);
	obj.body.push(bodyMessage);

	for await (const language of targetLanguages) {
		const targetTitleObj: Message = { language: language.locale, text: source.text.toString(), modifiedAt: sourceTitleModified };
		const targetBodyObj: Message = {
			language: language.locale,
			text: bodySource.data.text.toString(),
			modifiedAt: sourceBodyModified,
		};

		const translationTitleInfo = await getTranslationInfo(source.id, language.id);
		if (translationTitleInfo.length > 0) updateMessageWithTranslation(targetTitleObj, projectId, source.id, language.id);

		const translationBodyInfo = await getTranslationInfo(bodySource.data.id, language.id);
		if (translationBodyInfo.length > 0) updateMessageWithTranslation(targetBodyObj, projectId, bodySource.data.id, language.id);

		obj.title.push(targetTitleObj);
		obj.body.push(targetBodyObj);
	}

	return obj;
};

const getTranslationInfo = async (stringId: number, languageId: string) => {
	const translation = await stringTranslationsApi.listTranslationApprovals(projectId, { stringId, languageId });
	return translation.data;
};

const updateMessageWithTranslation = async (message: Message, projectId: number, stringId: number, languageId: string) => {
	const target = (await stringTranslationsApi.listStringTranslations(projectId, stringId, languageId)).data[0].data;
	const targetModified = target.createdAt;

	message.text = target.text;
	message.modifiedAt = new Date(targetModified).toISOString();
};

export const fetchCrowdinAnnouncements = async (clientRole: string) => {
	const role = clientRole ? JSON.parse(clientRole) : [];

	const targetLanguages = crowdinProject.targetLanguages;
	const sourceStrings = (await sourceStringsApi.listProjectStrings(projectId)).data;
	const finalResult: Announcement[] = [];

	for await (const { data: source } of sourceStrings) {
		let appTarget = source.identifier.split('-')[0];
		if (appTarget === 'pocket') appTarget = 'view_meeting_schedule';

		if (appTarget === 'public' || role.includes(appTarget)) {
			if (source.identifier.indexOf('-title') !== -1) {
				const bodyFilter = source.identifier.replace('-title', '-body');
				const bodySource = sourceStrings.find((item) => item.data.identifier === bodyFilter);

				if (bodySource) {
					const obj = await mapTargetLanguageMessages(source, bodySource, targetLanguages);
					const dateCreated = new Date(source.createdAt);
					const validDate = dateCreated.setHours(dateCreated.getHours() + 1);
					const validDateISO = new Date(validDate).toISOString();
					const checkDateISO = new Date().toISOString();

					if (validDateISO < checkDateISO || isDev) finalResult.push(obj);
				}
			}
		}
	}

	return finalResult;
};
