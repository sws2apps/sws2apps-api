type SaveAndRefreshOptions = {
	save: () => Promise<void>;
	updateLocalState?: () => void;
	refreshMetadata: () => Promise<void>;
};

export const saveAndRefresh = async ({
	save,
	updateLocalState,
	refreshMetadata,
}: SaveAndRefreshOptions) => {
	await save();
	updateLocalState?.();
	await refreshMetadata();
};
