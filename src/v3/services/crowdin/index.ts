import { Credentials, ProjectsGroups } from '@crowdin/crowdin-api-client';
import { env } from '../../../config/env.js';

export const getAppLanguages = async () => {
	try {
		const token = env.crowdinApiKey;
		const projectId = env.crowdinProjectId;

		if (!token || !projectId) return 0;

		const credentials: Credentials = { token };

		const projectsGroupsApi = new ProjectsGroups(credentials, {
			httpClientType: 'fetch',
		});

		const projectData = await projectsGroupsApi.getProject(+projectId);
		return projectData.data.targetLanguages.length + 1;
	} catch {
		return 0;
	}
};
