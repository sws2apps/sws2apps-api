export type StorageBaseType = {
	congId: string;
	filename: string;
};

export type StorageCongregation = {
	cong_discoverable?: { value: boolean; updatedAt: string };
	last_backup?: string;
};
