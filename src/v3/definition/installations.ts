export type AppInstallation = {
	linked: { user: string; installations: string[] }[];
	pending: string[];
};

export type InstallationItem = {
	id: string;
	registered: string;
	status: 'linked' | 'pending';
	user?: string;
};
