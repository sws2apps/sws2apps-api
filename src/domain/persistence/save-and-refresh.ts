type SaveAndRefreshOptions = {
	save: () => Promise<void>;
	updateLocalState?: () => void;
	refreshMetadata: () => Promise<void>;
};

/**
 * Applies a persistence workflow in strict order: save, publish local state,
 * then refresh metadata. A failed save leaves local state untouched; a failed
 * metadata refresh is surfaced after the persisted/local update has occurred.
 */
export const saveAndRefresh = async ({
	save,
	updateLocalState,
	refreshMetadata,
}: SaveAndRefreshOptions) => {
	await save();
	updateLocalState?.();
	await refreshMetadata();
};
