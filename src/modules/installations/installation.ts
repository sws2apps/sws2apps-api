export type AppInstallation = {
	linked: { user: string; installations: { id: string; last_handshake: string }[] }[];
	pending: { id: string; last_handshake: string }[];
};

export type InstallationItem = {
	id: string;
	last_handshake: string;
	status: 'linked' | 'pending';
	user?: string;
};
