import crowdin from '@crowdin/crowdin-api-client';

export const { projectsGroupsApi, sourceStringsApi, stringTranslationsApi } = new crowdin.default({
	token: process.env.CROWDIN_API_KEY,
});
