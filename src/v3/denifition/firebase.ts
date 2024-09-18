export type StorageBaseType = {
	type: 'congregation' | 'user';
	path: string;
};

export type StorageCongregation = {
	cong_discoverable?: { value: boolean; updatedAt: string };
	last_backup?: string;
};
