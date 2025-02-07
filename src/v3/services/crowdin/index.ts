import { Credentials, ProjectsGroups } from '@crowdin/crowdin-api-client';

export const getAppLanguages = async () => {
	try {
		const token = process.env.CROWDIN_API_KEY;
		const projectId = process.env.CROWDIN_PROJECT_ID;

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
