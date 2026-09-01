import { Credentials, ProjectsGroups } from '@crowdin/crowdin-api-client';

import { env } from '#config/env.js';

export const countProjectLanguages = (targetLanguages: readonly unknown[]): number => {
	const sourceLanguageCount = 1;

	return targetLanguages.length + sourceLanguageCount;
};

export const getApplicationLanguageCount = async (): Promise<number> => {
	try {
		const apiToken = env.crowdinApiKey;
		const projectId = env.crowdinProjectId;

		if (!apiToken || !projectId) {
			return 0;
		}

		const credentials: Credentials = { token: apiToken };
		const projectsApi = new ProjectsGroups(credentials, {
			httpClientType: 'fetch',
		});

		const projectResponse = await projectsApi.getProject(Number(projectId));

		return countProjectLanguages(projectResponse.data.targetLanguages);
	} catch {
		return 0;
	}
};
