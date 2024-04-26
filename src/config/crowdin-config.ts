import 'dotenv/config';
import { Credentials, ProjectsGroups, ProjectsGroupsModel, SourceStrings, StringTranslations } from '@crowdin/crowdin-api-client';

const token = process.env.CROWDIN_API_KEY!;
const projectId = +process.env.CROWDIN_PROJECT_ID!;

const credentials: Credentials = { token };

const projectsGroupsApi = new ProjectsGroups(credentials, {
	httpClientType: 'fetch',
});

const sourceStringsApi = new SourceStrings(credentials);
const stringTranslationsApi = new StringTranslations(credentials);

const projectsData = await projectsGroupsApi.getProject(projectId);
const crowdinProject = projectsData.data as ProjectsGroupsModel.ProjectSettings;

export { crowdinProject, sourceStringsApi, stringTranslationsApi };
