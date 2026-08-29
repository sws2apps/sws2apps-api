export type AppInstallation = {
	linked: { user: string; installations: { id: string; registered: string }[] }[];
	pending: { id: string; registered: string }[];
};

export type InstallationItem = {
	id: string;
	registered: string;
	status: 'linked' | 'pending';
	user?: string;
};
